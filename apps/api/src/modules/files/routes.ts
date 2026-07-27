import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

const extensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/csv': '.csv',
};

function detectedMime(bytes: Uint8Array, declaredMime: string): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  const prefix = Buffer.from(bytes.subarray(0, 12)).toString('ascii');
  if (prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP') return 'image/webp';
  if (prefix.startsWith('%PDF-')) return 'application/pdf';
  if (declaredMime === 'text/csv' && !bytes.includes(0)) return 'text/csv';
  return undefined;
}

function safeOriginalName(filename: string): string {
  return basename(filename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'file';
}

type FileRow = {
  id: string;
  organization_id: string;
  owner_user_id: string | null;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number | string | bigint;
  checksum_sha256: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SENSITIVE';
};

function mapFile(row: FileRow) {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    visibility: row.visibility,
  };
}

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  app.post('/files', { preHandler: app.authenticate }, async (request, reply) => {
    app.requireCsrf(request);
    if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
    const part = await request.file();
    if (!part) throw new AppError(422, 'FILE_REQUIRED', 'Pilih berkas yang akan diunggah.');
    if (!extensionByMime[part.mimetype]) {
      part.file.resume();
      throw new AppError(
        415,
        'FILE_TYPE_NOT_ALLOWED',
        'Gunakan gambar JPEG, PNG, WebP, dokumen PDF, atau CSV.',
      );
    }

    let bytes: Buffer;
    try {
      bytes = await part.toBuffer();
    } catch (error) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'Ukuran berkas melebihi batas 10 MB.', error);
    }
    if (bytes.length === 0) throw new AppError(422, 'FILE_EMPTY', 'Berkas tidak boleh kosong.');
    if (bytes.length > app.config.MAX_UPLOAD_BYTES) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'Ukuran berkas melebihi batas 10 MB.');
    }
    const mimeType = detectedMime(bytes, part.mimetype);
    if (!mimeType || mimeType !== part.mimetype) {
      throw new AppError(
        415,
        'FILE_CONTENT_MISMATCH',
        'Isi berkas tidak sesuai dengan jenis yang dinyatakan.',
      );
    }

    const id = ulid();
    const extension = extensionByMime[mimeType] ?? extname(part.filename).toLowerCase();
    const organizationDirectory = join(app.config.UPLOAD_DIR, request.auth.organizationId);
    const storageKey = join(request.auth.organizationId, `${id}${extension}`);
    const absolutePath = join(app.config.UPLOAD_DIR, storageKey);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    await mkdir(organizationDirectory, { recursive: true, mode: 0o750 });
    await writeFile(absolutePath, bytes, { flag: 'wx', mode: 0o640 });

    try {
      const result = await app.database.query<FileRow>(
        `INSERT INTO files
          (id, organization_id, owner_user_id, storage_key, original_name,
           mime_type, size_bytes, checksum_sha256, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PRIVATE')
         RETURNING id, organization_id, owner_user_id, storage_key, original_name,
           mime_type, size_bytes, checksum_sha256, visibility`,
        [
          id,
          request.auth.organizationId,
          request.auth.id,
          storageKey,
          safeOriginalName(part.filename),
          mimeType,
          bytes.length,
          checksum,
        ],
      );
      return reply.status(201).send(success(request, mapFile(result.rows[0]!)));
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  });

  app.get('/files/:id', { preHandler: app.authenticate }, async (request, reply) => {
    if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
    const { id } = request.params as { id: string };
    const result = await app.database.query<FileRow>(
      `SELECT id, organization_id, owner_user_id, storage_key, original_name,
         mime_type, size_bytes, checksum_sha256, visibility
       FROM files WHERE id = $1 AND organization_id = $2`,
      [id, request.auth.organizationId],
    );
    const file = result.rows[0];
    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    }
    const [paymentLink, documentLink] = await Promise.all([
      app.database.query<{ id: string }>(
        `SELECT id FROM payments
         WHERE organization_id = $1 AND proof_file_id = $2 LIMIT 1`,
        [request.auth.organizationId, file.id],
      ),
      app.database.query<{
        id: string;
        visibility: 'PUBLIC' | 'INTERNAL' | 'SENSITIVE';
        expires_at: string | Date | null;
      }>(
        `SELECT d.id, d.visibility, d.expires_at
         FROM document_versions dv
         JOIN documents d ON d.id = dv.document_id
           AND d.organization_id = dv.organization_id
         WHERE dv.organization_id = $1 AND dv.file_id = $2
         LIMIT 1`,
        [request.auth.organizationId, file.id],
      ),
    ]);
    const linkedDocument = documentLink.rows[0];
    const documentActive =
      linkedDocument &&
      (!linkedDocument.expires_at || new Date(linkedDocument.expires_at).getTime() > Date.now());
    const canReadPayment =
      Boolean(paymentLink.rows[0]) &&
      request.auth.permissions.includes('billing.reconcile');
    const canReadDocument = Boolean(
      documentActive &&
      (request.auth.permissions.includes('document.manage') ||
        (linkedDocument.visibility !== 'SENSITIVE' &&
          request.auth.permissions.includes('document.read'))),
    );
    const owner = file.owner_user_id === request.auth.id;
    if (!owner && !canReadPayment && !canReadDocument) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    }
    const storageRoot = resolve(app.config.UPLOAD_DIR);
    const absolutePath = resolve(storageRoot, file.storage_key);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${sep}`)) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    }
    const bytes = await readFile(absolutePath).catch(() => undefined);
    if (!bytes) throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    if (!owner && canReadPayment) {
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'payment.proof.read',
        entityType: 'file',
        entityId: file.id,
        requestId: request.id,
      });
    } else if (file.visibility === 'SENSITIVE') {
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'file.sensitive.read',
        entityType: 'file',
        entityId: file.id,
        requestId: request.id,
      });
    }
    return reply
      .type(file.mime_type)
      .header('cache-control', 'private, no-store')
      .header('content-disposition', `inline; filename="${safeOriginalName(file.original_name)}"`)
      .send(bytes);
  });

  app.get('/public/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await app.database.query<FileRow>(
      `SELECT id, organization_id, owner_user_id, storage_key, original_name,
         mime_type, size_bytes, checksum_sha256, visibility
       FROM files WHERE id = $1 AND visibility = 'PUBLIC'`,
      [id],
    );
    const file = result.rows[0];
    if (!file) throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    const storageRoot = resolve(app.config.UPLOAD_DIR);
    const absolutePath = resolve(storageRoot, file.storage_key);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${sep}`)) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    }
    const bytes = await readFile(absolutePath).catch(() => undefined);
    if (!bytes) throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan.');
    return reply
      .type(file.mime_type)
      .header('cache-control', 'public, max-age=3600')
      .header('content-disposition', `inline; filename="${safeOriginalName(file.original_name)}"`)
      .send(bytes);
  });
}
