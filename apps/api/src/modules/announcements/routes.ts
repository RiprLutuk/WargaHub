import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { z } from 'zod';
import {
  announcementCreateSchema,
  idSchema,
  isoDateSchema,
  pageQuerySchema,
} from '@wargahub/contracts';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type AnnouncementRow = {
  id: string;
  category: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  visibility: 'PUBLIC' | 'RESIDENT';
  urgency: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  pinned: boolean;
  version: number;
  publish_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const idParamsSchema = z.object({ id: idSchema });
const scheduleSchema = z.object({ publishAt: isoDateSchema });
const announcementUpdateSchema = z.object({
  category: announcementCreateSchema.shape.category.optional(),
  title: announcementCreateSchema.shape.title.optional(),
  summary: announcementCreateSchema.shape.summary.optional(),
  content: announcementCreateSchema.shape.content.optional(),
  visibility: announcementCreateSchema.shape.visibility.optional(),
  urgency: announcementCreateSchema.shape.urgency.optional(),
  expiresAt: isoDateSchema.nullable().optional(),
  pinned: z.boolean().optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Tidak ada perubahan yang dikirim.',
});

function announcementProjection(row: AnnouncementRow) {
  return {
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
    version: row.version,
    publishAt: row.publish_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || 'pengumuman';
}

async function uniqueSlug(app: FastifyInstance, organizationId: string, title: string) {
  const base = slugify(title);
  const existing = await app.database.query<{ id: string }>(
    'SELECT id FROM announcements WHERE organization_id = $1 AND slug = $2',
    [organizationId, base],
  );
  return existing.rows[0] ? `${base}-${ulid().slice(-6).toLowerCase()}` : base;
}

async function findAnnouncement(
  app: FastifyInstance,
  organizationId: string,
  id: string,
): Promise<AnnouncementRow | undefined> {
  const result = await app.database.query<AnnouncementRow>(
    `SELECT id, category, title, slug, summary, content, visibility, urgency,
            status, pinned, version, publish_at, published_at, expires_at,
            created_at, updated_at
     FROM announcements WHERE organization_id = $1 AND id = $2`,
    [organizationId, id],
  );
  return result.rows[0];
}

function requireFutureSchedule(publishAt: string): void {
  if (new Date(publishAt).getTime() <= Date.now()) {
    throw new AppError(
      422,
      'INVALID_PUBLISH_TIME',
      'Jadwal terbit harus berada di masa mendatang.',
    );
  }
}

export async function announcementRoutes(app: FastifyInstance): Promise<void> {
  app.get('/announcements', {
    preHandler: app.requirePermission('announcement.read'),
  }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const canManage = request.auth!.permissions.includes('announcement.create');
    const params: unknown[] = [request.auth!.organizationId];
    const conditions = ['organization_id = $1'];
    if (!canManage) {
      conditions.push(`status = 'PUBLISHED'`);
      conditions.push(`(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      const placeholder = `$${params.length}`;
      conditions.push(`(title ILIKE ${placeholder} OR summary ILIKE ${placeholder})`);
    }
    const where = conditions.join(' AND ');
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM announcements WHERE ${where}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await app.database.query<AnnouncementRow>(
      `SELECT id, category, title, slug, summary, content, visibility, urgency,
              status, pinned, version, publish_at, published_at, expires_at,
              created_at, updated_at
       FROM announcements WHERE ${where}
       ORDER BY pinned DESC, coalesce(published_at, publish_at, created_at) DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, rows.rows.map(announcementProjection), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.post('/announcements', {
    preHandler: app.requirePermission('announcement.create'),
  }, async (request, reply) => {
    app.requireCsrf(request);
    const input = announcementCreateSchema.parse(request.body);
    if (input.publishAt) requireFutureSchedule(input.publishAt);
    if (input.publishAt && input.expiresAt &&
        new Date(input.expiresAt).getTime() <= new Date(input.publishAt).getTime()) {
      throw new AppError(422, 'INVALID_EXPIRY', 'Masa berlaku harus setelah waktu terbit.');
    }
    const organizationId = request.auth!.organizationId;
    const id = ulid();
    const slug = await uniqueSlug(app, organizationId, input.title);
    const result = await app.database.query<AnnouncementRow>(
      `INSERT INTO announcements
        (id, organization_id, author_id, category, title, slug, summary, content,
         visibility, urgency, status, pinned, publish_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, category, title, slug, summary, content, visibility, urgency,
                 status, pinned, version, publish_at, published_at, expires_at,
                 created_at, updated_at`,
      [
        id,
        organizationId,
        request.auth!.id,
        input.category,
        input.title,
        slug,
        input.summary,
        input.content,
        input.visibility,
        input.urgency,
        input.publishAt ? 'SCHEDULED' : 'DRAFT',
        input.pinned,
        input.publishAt ?? null,
        input.expiresAt ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(500, 'ANNOUNCEMENT_CREATE_FAILED', 'Pengumuman gagal disimpan.');
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'announcement.create',
      entityType: 'announcement',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      after: announcementProjection(row),
    });
    return reply.status(201).send(success(request, announcementProjection(row)));
  });

  app.patch('/announcements/:id', {
    preHandler: app.requirePermission('announcement.create'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const input = announcementUpdateSchema.parse(request.body);
    const organizationId = request.auth!.organizationId;
    const before = await findAnnouncement(app, organizationId, id);
    if (!before) throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    if (before.status !== 'DRAFT' && before.status !== 'SCHEDULED') {
      throw new AppError(
        409,
        'INVALID_ANNOUNCEMENT_STATE',
        'Hanya draft atau pengumuman terjadwal yang dapat diedit.',
      );
    }
    const expiresAt = input.expiresAt === undefined ? before.expires_at : input.expiresAt;
    if (before.publish_at && expiresAt &&
        new Date(expiresAt).getTime() <= new Date(before.publish_at).getTime()) {
      throw new AppError(422, 'INVALID_EXPIRY', 'Masa berlaku harus setelah waktu terbit.');
    }
    const title = input.title ?? before.title;
    const slug = input.title && input.title !== before.title
      ? await uniqueSlug(app, organizationId, input.title)
      : before.slug;
    const result = await app.database.query<AnnouncementRow>(
      `UPDATE announcements
       SET category = $1, title = $2, slug = $3, summary = $4, content = $5,
           visibility = $6, urgency = $7, pinned = $8, expires_at = $9,
           version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $10 AND id = $11
       RETURNING id, category, title, slug, summary, content, visibility, urgency,
                 status, pinned, version, publish_at, published_at, expires_at,
                 created_at, updated_at`,
      [
        input.category ?? before.category,
        title,
        slug,
        input.summary ?? before.summary,
        input.content ?? before.content,
        input.visibility ?? before.visibility,
        input.urgency ?? before.urgency,
        input.pinned ?? before.pinned,
        expiresAt,
        organizationId,
        id,
      ],
    );
    const row = result.rows[0]!;
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'announcement.update',
      entityType: 'announcement',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: announcementProjection(before),
      after: announcementProjection(row),
    });
    return success(request, announcementProjection(row));
  });

  app.get('/announcements/:id', {
    preHandler: app.requirePermission('announcement.read'),
  }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const row = await findAnnouncement(app, request.auth!.organizationId, id);
    const canManage = request.auth!.permissions.includes('announcement.create');
    if (!row || (!canManage &&
        (row.status !== 'PUBLISHED' ||
         (row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now())))) {
      throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    }
    return success(request, announcementProjection(row));
  });

  app.post('/announcements/:id/schedule', {
    preHandler: app.requirePermission('announcement.publish'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const input = scheduleSchema.parse(request.body);
    requireFutureSchedule(input.publishAt);
    const before = await findAnnouncement(app, request.auth!.organizationId, id);
    if (!before) throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    if (before.status === 'ARCHIVED') {
      throw new AppError(409, 'INVALID_ANNOUNCEMENT_STATE', 'Pengumuman yang diarsipkan tidak dapat dijadwalkan.');
    }
    if (before.expires_at &&
        new Date(before.expires_at).getTime() <= new Date(input.publishAt).getTime()) {
      throw new AppError(422, 'INVALID_EXPIRY', 'Masa berlaku harus setelah waktu terbit.');
    }
    const result = await app.database.query<AnnouncementRow>(
      `UPDATE announcements
       SET status = 'SCHEDULED', publish_at = $1, published_at = NULL,
           version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $2 AND id = $3
       RETURNING id, category, title, slug, summary, content, visibility, urgency,
                 status, pinned, version, publish_at, published_at, expires_at,
                 created_at, updated_at`,
      [input.publishAt, request.auth!.organizationId, id],
    );
    const row = result.rows[0]!;
    await recordAudit(app.database, {
      organizationId: request.auth!.organizationId,
      actorId: request.auth!.id,
      action: 'announcement.schedule',
      entityType: 'announcement',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: announcementProjection(before),
      after: announcementProjection(row),
    });
    return success(request, announcementProjection(row));
  });

  app.post('/announcements/:id/publish', {
    preHandler: app.requirePermission('announcement.publish'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const before = await findAnnouncement(app, request.auth!.organizationId, id);
    if (!before) throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    if (before.status === 'ARCHIVED') {
      throw new AppError(409, 'INVALID_ANNOUNCEMENT_STATE', 'Pengumuman yang diarsipkan tidak dapat diterbitkan.');
    }
    if (before.status === 'PUBLISHED') return success(request, announcementProjection(before));
    const result = await app.database.query<AnnouncementRow>(
      `UPDATE announcements
       SET status = 'PUBLISHED', publish_at = CURRENT_TIMESTAMP,
           published_at = CURRENT_TIMESTAMP, version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2
       RETURNING id, category, title, slug, summary, content, visibility, urgency,
                 status, pinned, version, publish_at, published_at, expires_at,
                 created_at, updated_at`,
      [request.auth!.organizationId, id],
    );
    const row = result.rows[0]!;
    await recordAudit(app.database, {
      organizationId: request.auth!.organizationId,
      actorId: request.auth!.id,
      action: 'announcement.publish',
      entityType: 'announcement',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: announcementProjection(before),
      after: announcementProjection(row),
    });
    return success(request, announcementProjection(row));
  });

  app.post('/announcements/:id/archive', {
    preHandler: app.requirePermission('announcement.publish'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const before = await findAnnouncement(app, request.auth!.organizationId, id);
    if (!before) throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    if (before.status === 'ARCHIVED') return success(request, announcementProjection(before));
    const result = await app.database.query<AnnouncementRow>(
      `UPDATE announcements
       SET status = 'ARCHIVED', version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2
       RETURNING id, category, title, slug, summary, content, visibility, urgency,
                 status, pinned, version, publish_at, published_at, expires_at,
                 created_at, updated_at`,
      [request.auth!.organizationId, id],
    );
    const row = result.rows[0]!;
    await recordAudit(app.database, {
      organizationId: request.auth!.organizationId,
      actorId: request.auth!.id,
      action: 'announcement.archive',
      entityType: 'announcement',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: announcementProjection(before),
      after: announcementProjection(row),
    });
    return success(request, announcementProjection(row));
  });

  app.post('/announcements/:id/acknowledge', {
    preHandler: app.requirePermission('announcement.read'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const announcement = await findAnnouncement(app, request.auth!.organizationId, id);
    if (!announcement || announcement.status !== 'PUBLISHED' ||
        (announcement.expires_at !== null &&
         new Date(announcement.expires_at).getTime() <= Date.now())) {
      throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    }
    const result = await app.database.query<{ acknowledged_at: string }>(
      `INSERT INTO announcement_reads
        (organization_id, announcement_id, user_id, acknowledged_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id, announcement_id, user_id)
       DO UPDATE SET acknowledged_at = EXCLUDED.acknowledged_at
       RETURNING acknowledged_at`,
      [request.auth!.organizationId, id, request.auth!.id],
    );
    return success(request, {
      announcementId: id,
      acknowledgedAt: result.rows[0]!.acknowledged_at,
    });
  });
}
