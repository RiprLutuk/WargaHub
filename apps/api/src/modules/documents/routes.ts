import { readFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { z } from 'zod';
import {
  documentCreateSchema,
  idSchema,
  pageQuerySchema,
} from '@wargahub/contracts';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type DocumentRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  visibility: 'PUBLIC' | 'INTERNAL' | 'SENSITIVE';
  current_version: number;
  file_id: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const idParamsSchema = z.object({ id: idSchema });

function documentProjection(row: DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    visibility: row.visibility,
    currentVersion: row.current_version,
    downloadUrl: row.file_id ? `/api/v1/documents/${row.id}/download` : null,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function safeOriginalName(filename: string): string {
  return basename(filename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'document';
}

function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || 'dokumen';
}

async function uniqueSlug(app: FastifyInstance, organizationId: string, title: string) {
  const base = slugify(title);
  const existing = await app.database.query<{ id: string }>(
    'SELECT id FROM documents WHERE organization_id = $1 AND slug = $2',
    [organizationId, base],
  );
  return existing.rows[0] ? `${base}-${ulid().slice(-6).toLowerCase()}` : base;
}

async function findDocument(
  app: FastifyInstance,
  organizationId: string,
  id: string,
): Promise<DocumentRow | undefined> {
  const result = await app.database.query<DocumentRow>(
    `SELECT id, title, slug, description, category, visibility, current_version,
            (SELECT dv.file_id FROM document_versions dv
             WHERE dv.organization_id = documents.organization_id
               AND dv.document_id = documents.id
               AND dv.version = documents.current_version) AS file_id,
            published_at, expires_at, created_at
     FROM documents WHERE organization_id = $1 AND id = $2`,
    [organizationId, id],
  );
  return result.rows[0];
}

export async function documentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/documents', {
    preHandler: app.requirePermission('document.read'),
  }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const canManage = request.auth!.permissions.includes('document.manage');
    const params: unknown[] = [request.auth!.organizationId];
    const conditions = ['organization_id = $1'];
    if (!canManage) conditions.push(`visibility IN ('PUBLIC', 'INTERNAL')`);
    conditions.push(`(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`);
    if (query.search) {
      params.push(`%${query.search}%`);
      const placeholder = `$${params.length}`;
      conditions.push(`(title ILIKE ${placeholder} OR
                        coalesce(description, '') ILIKE ${placeholder} OR
                        category ILIKE ${placeholder})`);
    }
    const where = conditions.join(' AND ');
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM documents WHERE ${where}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<DocumentRow>(
      `SELECT id, title, slug, description, category, visibility, current_version,
              (SELECT dv.file_id FROM document_versions dv
               WHERE dv.organization_id = documents.organization_id
                 AND dv.document_id = documents.id
                 AND dv.version = documents.current_version) AS file_id,
              published_at, expires_at, created_at
       FROM documents WHERE ${where}
       ORDER BY coalesce(published_at, created_at) DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map(documentProjection), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.post('/documents', {
    preHandler: app.requirePermission('document.manage'),
  }, async (request, reply) => {
    app.requireCsrf(request);
    const input = documentCreateSchema.parse(request.body);
    const organizationId = request.auth!.organizationId;
    let checksum: string | null = null;
    if (input.fileId) {
      const file = await app.database.query<{ checksum_sha256: string }>(
        `SELECT f.checksum_sha256 FROM files f
         WHERE f.organization_id = $1 AND f.id = $2 AND f.owner_user_id = $3
           AND NOT EXISTS (
             SELECT 1 FROM payments p
             WHERE p.organization_id = f.organization_id AND p.proof_file_id = f.id
           )
           AND NOT EXISTS (
             SELECT 1 FROM document_versions dv
             WHERE dv.organization_id = f.organization_id AND dv.file_id = f.id
           )`,
        [organizationId, input.fileId, request.auth!.id],
      );
      if (!file.rows[0]) throw new AppError(422, 'INVALID_FILE', 'Berkas tidak ditemukan.');
      checksum = file.rows[0].checksum_sha256;
    }

    const id = ulid();
    const versionId = ulid();
    const slug = await uniqueSlug(app, organizationId, input.title);
    await app.database.transaction(async (transaction) => {
      await transaction.query(
        `INSERT INTO documents
          (id, organization_id, owner_id, title, slug, description, category, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          organizationId,
          request.auth!.id,
          input.title,
          slug,
          input.description ?? null,
          input.category,
          input.visibility,
        ],
      );
      await transaction.query(
        `INSERT INTO document_versions
          (id, organization_id, document_id, file_id, version, checksum_sha256, created_by)
         VALUES ($1, $2, $3, $4, 1, $5, $6)`,
        [versionId, organizationId, id, input.fileId ?? null, checksum, request.auth!.id],
      );
    });
    const row = await findDocument(app, organizationId, id);
    if (!row) throw new AppError(500, 'DOCUMENT_CREATE_FAILED', 'Dokumen gagal disimpan.');
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'document.create',
      entityType: 'document',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      after: documentProjection(row),
    });
    return reply.status(201).send(success(request, documentProjection(row)));
  });

  app.get('/documents/:id/download', {
    preHandler: app.requirePermission('document.read'),
  }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const row = await findDocument(app, request.auth!.organizationId, id);
    const canManage = request.auth!.permissions.includes('document.manage');
    if (!row || !row.file_id || (!canManage && row.visibility === 'SENSITIVE') ||
        (row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now())) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    }
    const result = await app.database.query<{
      storage_key: string;
      original_name: string;
      mime_type: string;
    }>(
      `SELECT storage_key, original_name, mime_type FROM files
       WHERE organization_id = $1 AND id = $2`,
      [request.auth!.organizationId, row.file_id],
    );
    const file = result.rows[0];
    if (!file) throw new AppError(404, 'DOCUMENT_FILE_NOT_FOUND', 'Berkas dokumen tidak ditemukan.');
    const storageRoot = resolve(app.config.UPLOAD_DIR);
    const absolutePath = resolve(storageRoot, file.storage_key);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${sep}`)) {
      throw new AppError(404, 'DOCUMENT_FILE_NOT_FOUND', 'Berkas dokumen tidak ditemukan.');
    }
    const bytes = await readFile(absolutePath).catch(() => undefined);
    if (!bytes) throw new AppError(404, 'DOCUMENT_FILE_NOT_FOUND', 'Berkas dokumen tidak ditemukan.');
    if (row.visibility === 'SENSITIVE') {
      await recordAudit(app.database, {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.id,
        action: 'document.sensitive.read',
        entityType: 'document',
        entityId: id,
        requestId: request.id,
        ipAddress: request.ip,
      });
    }
    return reply
      .type(file.mime_type)
      .header('cache-control', 'private, no-store')
      .header('content-disposition', `inline; filename="${safeOriginalName(file.original_name)}"`)
      .send(bytes);
  });

  app.get('/documents/:id', {
    preHandler: app.requirePermission('document.read'),
  }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const row = await findDocument(app, request.auth!.organizationId, id);
    const canManage = request.auth!.permissions.includes('document.manage');
    if (!row || (!canManage && row.visibility === 'SENSITIVE') ||
        (row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now())) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    }
    return success(request, documentProjection(row));
  });

  app.post('/documents/:id/publish', {
    preHandler: app.requirePermission('document.manage'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const before = await findDocument(app, request.auth!.organizationId, id);
    if (!before) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    if (before.published_at) return success(request, documentProjection(before));
    await app.database.query(
      `UPDATE documents SET published_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2`,
      [request.auth!.organizationId, id],
    );
    const row = await findDocument(app, request.auth!.organizationId, id);
    if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    await recordAudit(app.database, {
      organizationId: request.auth!.organizationId,
      actorId: request.auth!.id,
      action: 'document.publish',
      entityType: 'document',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: documentProjection(before),
      after: documentProjection(row),
    });
    return success(request, documentProjection(row));
  });
}
