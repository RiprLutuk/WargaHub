import { readFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { idSchema, pageQuerySchema } from '@wargahub/contracts';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';

type PublicOrganizationRow = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  description: string;
  address: string;
  emergency_phone: string;
  timezone: string;
  locale: string;
};

const idParamsSchema = z.object({ id: idSchema });

function safeOriginalName(filename: string): string {
  return basename(filename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'document';
}

async function publicOrganization(app: FastifyInstance): Promise<PublicOrganizationRow> {
  const result = await app.database.query<PublicOrganizationRow>(
    `SELECT id, name, short_name, slug, description, address, emergency_phone,
            timezone, locale
     FROM organizations ORDER BY created_at LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'PUBLIC_SITE_NOT_FOUND', 'Halaman lingkungan belum tersedia.');
  return row;
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public/site', async (request) => {
    const organization = await publicOrganization(app);
    return success(request, {
      name: organization.name,
      shortName: organization.short_name,
      slug: organization.slug,
      description: organization.description,
      address: organization.address,
      emergencyPhone: organization.emergency_phone,
      timezone: organization.timezone,
      locale: organization.locale,
    });
  });

  app.get('/public/announcements', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR summary ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM announcements
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      category: string;
      title: string;
      slug: string;
      summary: string;
      content: string;
      visibility: 'PUBLIC';
      urgency: string;
      status: 'PUBLISHED';
      pinned: boolean;
      published_at: string;
      expires_at: string | null;
    }>(
      `SELECT id, category, title, slug, summary, content, visibility, urgency,
              status, pinned, published_at, expires_at
       FROM announcements
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}
       ORDER BY pinned DESC, published_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      visibility: row.visibility,
      urgency: row.urgency,
      status: row.status,
      pinned: row.pinned,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
    })), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.get('/public/documents', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR coalesce(description, '') ILIKE $2 OR category ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM documents
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND published_at IS NOT NULL
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      category: string;
      visibility: 'PUBLIC';
      current_version: number;
      file_id: string | null;
      published_at: string;
      expires_at: string | null;
    }>(
      `SELECT id, title, slug, description, category, visibility, current_version,
              (SELECT dv.file_id FROM document_versions dv
               WHERE dv.organization_id = documents.organization_id
                 AND dv.document_id = documents.id
                 AND dv.version = documents.current_version) AS file_id,
              published_at, expires_at
       FROM documents
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND published_at IS NOT NULL
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}
       ORDER BY published_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      category: row.category,
      visibility: row.visibility,
      currentVersion: row.current_version,
      downloadUrl: row.file_id ? `/api/v1/public/documents/${row.id}/download` : null,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
    })), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.get('/public/documents/:id/download', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      storage_key: string;
      original_name: string;
      mime_type: string;
    }>(
      `SELECT f.storage_key, f.original_name, f.mime_type
       FROM documents d
       JOIN document_versions dv
         ON dv.organization_id = d.organization_id
        AND dv.document_id = d.id
        AND dv.version = d.current_version
       JOIN files f ON f.organization_id = d.organization_id AND f.id = dv.file_id
       WHERE d.organization_id = $1 AND d.id = $2
         AND d.visibility = 'PUBLIC' AND d.published_at IS NOT NULL
         AND (d.expires_at IS NULL OR d.expires_at > CURRENT_TIMESTAMP)`,
      [organization.id, id],
    );
    const file = result.rows[0];
    if (!file) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    const storageRoot = resolve(app.config.UPLOAD_DIR);
    const absolutePath = resolve(storageRoot, file.storage_key);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${sep}`)) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    }
    const bytes = await readFile(absolutePath).catch(() => undefined);
    if (!bytes) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    return reply
      .type(file.mime_type)
      .header('cache-control', 'public, max-age=3600')
      .header('content-disposition', `inline; filename="${safeOriginalName(file.original_name)}"`)
      .send(bytes);
  });

  app.get('/public/transparency', async (request) => {
    const organization = await publicOrganization(app);
    const totals = await app.database.query<{
      income: number | string | bigint;
      expense: number | string | bigint;
    }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0) AS income,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0) AS expense
       FROM finance_transactions
       WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')`,
      [organization.id],
    );
    const monthly = await app.database.query<{
      period: string;
      income: number | string | bigint;
      expense: number | string | bigint;
    }>(
      `SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS period,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0) AS income,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0) AS expense
       FROM finance_transactions
       WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')
       GROUP BY date_trunc('month', occurred_at)
       ORDER BY date_trunc('month', occurred_at) DESC LIMIT 12`,
      [organization.id],
    );
    const income = Number(totals.rows[0]?.income ?? 0);
    const expense = Number(totals.rows[0]?.expense ?? 0);
    return success(request, {
      currency: 'IDR',
      income,
      expense,
      balance: income - expense,
      monthly: monthly.rows.map((row) => ({
        period: row.period,
        income: Number(row.income),
        expense: Number(row.expense),
      })),
      note: 'Laporan publik hanya menampilkan nilai agregat yang sudah disanitasi.',
    });
  });

  app.get('/public/events', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM activities
       WHERE organization_id = $1 AND status = 'PUBLISHED'
         AND ends_at >= CURRENT_TIMESTAMP`,
      [organization.id],
    );
    const events = await app.database.query<{
      id: string;
      title: string;
      description: string;
      location: string;
      starts_at: string | Date;
      ends_at: string | Date;
      capacity: number | null;
    }>(
      `SELECT id, title, description, location, starts_at, ends_at, capacity
       FROM activities WHERE organization_id = $1 AND status = 'PUBLISHED'
         AND ends_at >= CURRENT_TIMESTAMP
       ORDER BY starts_at ASC LIMIT $2 OFFSET $3`,
      [organization.id, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return success(
      request,
      events.rows.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: new Date(event.starts_at).toISOString(),
        endsAt: new Date(event.ends_at).toISOString(),
        capacity: event.capacity,
      })),
      { page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? 0 },
    );
  });
}
