import {
  complaintCreateSchema,
  complaintStatusSchema,
  pageQuerySchema,
  type ComplaintStatus,
} from '@wargahub/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ulid } from 'ulidx';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type ComplaintRow = {
  id: string;
  ticket_number: string;
  reporter_id: string;
  assigned_to: string | null;
  category: string;
  title: string;
  description: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  location: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: ComplaintStatus;
  created_at: string | Date;
  updated_at: string | Date;
};

const allowedTransitions: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['VERIFIED', 'ASSIGNED', 'REJECTED'],
  VERIFIED: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_REPORTER', 'WAITING_FOR_VENDOR', 'RESOLVED'],
  IN_PROGRESS: ['WAITING_FOR_REPORTER', 'WAITING_FOR_VENDOR', 'RESOLVED'],
  WAITING_FOR_REPORTER: ['IN_PROGRESS', 'RESOLVED'],
  WAITING_FOR_VENDOR: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

function mapComplaint(row: ComplaintRow, includeRelationships = true) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    ...(includeRelationships
      ? { reporterId: row.reporter_id, assignedTo: row.assigned_to }
      : {}),
    category: row.category,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    location: row.location,
    priority: row.priority,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function managesComplaintQueue(request: FastifyRequest): boolean {
  return Boolean(request.auth?.permissions.includes('complaint.assign'));
}

function isComplaintReporter(request: FastifyRequest, row: ComplaintRow): boolean {
  return row.reporter_id === request.auth?.id;
}

function isComplaintAssignee(request: FastifyRequest, row: ComplaintRow): boolean {
  return row.assigned_to === request.auth?.id;
}

function canSeeComplaintDetails(request: FastifyRequest, row: ComplaintRow): boolean {
  return (
    managesComplaintQueue(request) ||
    isComplaintReporter(request, row) ||
    isComplaintAssignee(request, row)
  );
}

function canOperateComplaint(request: FastifyRequest, row: ComplaintRow): boolean {
  return managesComplaintQueue(request) || isComplaintAssignee(request, row);
}

function canSeeComplaint(request: FastifyRequest, row: ComplaintRow): boolean {
  return canSeeComplaintDetails(request, row) || row.visibility === 'PUBLIC';
}

async function complaintById(
  app: FastifyInstance,
  request: FastifyRequest,
  id: string,
): Promise<ComplaintRow> {
  const result = await app.database.query<ComplaintRow>(
    `SELECT id, ticket_number, reporter_id, assigned_to, category, title,
       description, visibility, location, priority, status, created_at, updated_at
     FROM complaints WHERE id = $1 AND organization_id = $2`,
    [id, request.auth?.organizationId],
  );
  const row = result.rows[0];
  if (!row || !canSeeComplaint(request, row)) {
    throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Pengaduan tidak ditemukan.');
  }
  return row;
}

export async function complaintRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/complaints',
    { preHandler: app.requirePermission('complaint.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const values: unknown[] = [request.auth?.organizationId];
      let scope = '';
      if (!managesComplaintQueue(request)) {
        values.push(request.auth?.id);
        scope = ` AND (reporter_id = $2 OR assigned_to = $2 OR visibility = 'PUBLIC')`;
      }
      values.push(page.pageSize, (page.page - 1) * page.pageSize);
      const result = await app.database.query<ComplaintRow & { total_count: number | string }>(
        `SELECT id, ticket_number, reporter_id, assigned_to, category, title,
           description, visibility, location, priority, status, created_at, updated_at,
           COUNT(*) OVER() AS total_count
         FROM complaints WHERE organization_id = $1${scope}
         ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return success(
        request,
        result.rows.map((row) => mapComplaint(row, canSeeComplaintDetails(request, row))),
        {
          page: page.page,
          pageSize: page.pageSize,
          total: Number(result.rows[0]?.total_count ?? 0),
        },
      );
    },
  );

  app.post(
    '/complaints',
    { preHandler: app.requirePermission('complaint.read') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const input = complaintCreateSchema.parse(request.body);
      const id = ulid();
      const ticketNumber = `WH-${new Date().getUTCFullYear()}-${id.slice(-6)}`;
      const result = await app.database.query<ComplaintRow>(
        `INSERT INTO complaints
          (id, organization_id, ticket_number, reporter_id, category, title,
           description, visibility, location, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SUBMITTED')
         RETURNING id, ticket_number, reporter_id, assigned_to, category, title,
           description, visibility, location, priority, status, created_at, updated_at`,
        [
          id,
          request.auth.organizationId,
          ticketNumber,
          request.auth.id,
          input.category,
          input.title,
          input.description,
          input.visibility,
          input.location ?? null,
          input.priority,
        ],
      );
      await app.database.query(
        `INSERT INTO complaint_status_histories
          (id, organization_id, complaint_id, actor_id, from_status, to_status, message)
         VALUES ($1, $2, $3, $4, NULL, 'SUBMITTED', 'Pengaduan dikirim.')`,
        [ulid(), request.auth.organizationId, id, request.auth.id],
      );
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'complaint.create',
        entityType: 'complaint',
        entityId: id,
        requestId: request.id,
        after: { status: 'SUBMITTED', visibility: input.visibility },
      });
      return reply.status(201).send(success(request, mapComplaint(result.rows[0]!)));
    },
  );

  app.get(
    '/complaints/:id',
    { preHandler: app.requirePermission('complaint.read') },
    async (request) => {
      const { id } = request.params as { id: string };
      const complaint = await complaintById(app, request, id);
      if (!canSeeComplaintDetails(request, complaint)) {
        return success(request, mapComplaint(complaint, false));
      }
      const canSeeInternalDetails = canOperateComplaint(request, complaint);
      const history = await app.database.query<{
        to_status: ComplaintStatus;
        message: string | null;
        created_at: string | Date;
      }>(
        `SELECT to_status, message, created_at FROM complaint_status_histories
         WHERE complaint_id = $1 AND organization_id = $2
           AND ($3 = TRUE OR public_to_reporter = TRUE)
         ORDER BY created_at ASC`,
        [id, request.auth?.organizationId, canSeeInternalDetails],
      );
      const comments = await app.database.query<{
        id: string;
        author_id: string;
        body: string;
        visibility: 'REPORTER' | 'INTERNAL';
        created_at: string | Date;
      }>(
        `SELECT id, author_id, body, visibility, created_at FROM complaint_comments
         WHERE complaint_id = $1 AND organization_id = $2
           AND ($3 = TRUE OR visibility = 'REPORTER')
         ORDER BY created_at ASC`,
        [id, request.auth?.organizationId, canSeeInternalDetails],
      );
      return success(request, {
        ...mapComplaint(complaint),
        history: history.rows.map((row) => ({
          status: row.to_status,
          message: row.message,
          createdAt: new Date(row.created_at).toISOString(),
        })),
        comments: comments.rows.map((row) => ({
          id: row.id,
          authorId: row.author_id,
          body: row.body,
          visibility: row.visibility,
          createdAt: new Date(row.created_at).toISOString(),
        })),
      });
    },
  );

  app.post(
    '/complaints/:id/comments',
    { preHandler: app.requirePermission('complaint.read') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const input = z
        .object({
          body: z.string().trim().min(2).max(3000),
          visibility: z.enum(['REPORTER', 'INTERNAL']).default('REPORTER'),
        })
        .parse(request.body);
      const complaint = await complaintById(app, request, id);
      const canOperate = canOperateComplaint(request, complaint);
      if (!canOperate && !isComplaintReporter(request, complaint)) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat menanggapi pengaduan ini.');
      }
      if (input.visibility === 'INTERNAL' && !canOperate) {
        throw new AppError(403, 'FORBIDDEN', 'Komentar internal hanya untuk petugas berizin.');
      }
      const commentId = ulid();
      const result = await app.database.query<{
        id: string;
        author_id: string;
        body: string;
        visibility: 'REPORTER' | 'INTERNAL';
        created_at: string | Date;
      }>(
        `INSERT INTO complaint_comments
          (id, organization_id, complaint_id, author_id, body, visibility)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, author_id, body, visibility, created_at`,
        [
          commentId,
          request.auth.organizationId,
          id,
          request.auth.id,
          input.body,
          input.visibility,
        ],
      );
      if (input.visibility === 'REPORTER' && request.auth.id !== complaint.reporter_id) {
        await app.database.query(
          `INSERT INTO notifications
            (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
           VALUES ($1, $2, $3, 'COMPLAINT_COMMENT', 'Tanggapan baru pada pengaduan',
             $4, $5, $6)
           ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
          [
            ulid(),
            request.auth.organizationId,
            complaint.reporter_id,
            input.body.slice(0, 180),
            `/app/pengaduan/${id}`,
            `complaint-comment:${commentId}`,
          ],
        );
      }
      const row = result.rows[0]!;
      return reply.status(201).send(
        success(request, {
          id: row.id,
          authorId: row.author_id,
          body: row.body,
          visibility: row.visibility,
          createdAt: new Date(row.created_at).toISOString(),
        }),
      );
    },
  );

  app.post(
    '/complaints/:id/assign',
    { preHandler: app.requirePermission('complaint.assign') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const { assigneeId } = request.body as { assigneeId?: string };
      if (!assigneeId) throw new AppError(422, 'ASSIGNEE_REQUIRED', 'Pilih penanggung jawab.');
      const assignee = await app.database.query<{ id: string; eligible: boolean }>(
        `SELECT u.id,
           EXISTS (
             SELECT 1
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id AND r.organization_id = u.organization_id
             JOIN role_permissions rp ON rp.role_id = r.id
             WHERE ur.user_id = u.id
               AND ur.organization_id = u.organization_id
               AND ur.scope_type = 'ORGANIZATION'
               AND ur.scope_id = u.organization_id
               AND rp.permission_code IN ('complaint.assign', 'complaint.resolve')
           ) AS eligible
         FROM users u
         WHERE u.id = $1 AND u.organization_id = $2 AND u.status = 'ACTIVE'`,
        [assigneeId, request.auth.organizationId],
      );
      if (!assignee.rows[0]) {
        throw new AppError(404, 'ASSIGNEE_NOT_FOUND', 'Petugas tidak ditemukan.');
      }
      if (!assignee.rows[0].eligible) {
        throw new AppError(
          422,
          'ASSIGNEE_NOT_ELIGIBLE',
          'Penanggung jawab harus memiliki izin penanganan pengaduan tingkat organisasi.',
        );
      }
      const current = await complaintById(app, request, id);
      if (!['SUBMITTED', 'VERIFIED'].includes(current.status)) {
        throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Pengaduan tidak dapat ditugaskan dari status saat ini.');
      }
      const updated = await app.database.query<ComplaintRow>(
        `UPDATE complaints SET assigned_to = $1, status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND organization_id = $3
         RETURNING id, ticket_number, reporter_id, assigned_to, category, title,
           description, visibility, location, priority, status, created_at, updated_at`,
        [assigneeId, id, request.auth.organizationId],
      );
      await app.database.query(
        `INSERT INTO complaint_status_histories
          (id, organization_id, complaint_id, actor_id, from_status, to_status, message)
         VALUES ($1, $2, $3, $4, $5, 'ASSIGNED', 'Pengaduan telah memiliki penanggung jawab.')`,
        [ulid(), request.auth.organizationId, id, request.auth.id, current.status],
      );
      await app.database.query(
        `INSERT INTO notifications
          (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
         VALUES ($1, $2, $3, 'COMPLAINT_ASSIGNED', 'Tugas pengaduan baru', $4, $5, $6)
         ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
        [
          ulid(),
          request.auth.organizationId,
          assigneeId,
          `${current.ticket_number}: ${current.title}`,
          `/admin/pengaduan/${id}`,
          `complaint-assigned:${id}:${assigneeId}`,
        ],
      );
      return success(request, mapComplaint(updated.rows[0]!));
    },
  );

  app.post(
    '/complaints/:id/status',
    { preHandler: app.requirePermission('complaint.resolve') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const body = request.body as { status?: unknown; message?: string };
      const nextStatus = complaintStatusSchema.parse(body.status);
      const current = await complaintById(app, request, id);
      if (!canOperateComplaint(request, current)) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Pengaduan hanya dapat diperbarui oleh pengelola antrean atau petugas yang ditugaskan.',
        );
      }
      if (!allowedTransitions[current.status].includes(nextStatus)) {
        throw new AppError(
          409,
          'INVALID_STATUS_TRANSITION',
          `Status ${current.status} tidak dapat langsung menjadi ${nextStatus}.`,
        );
      }
      const result = await app.database.query<ComplaintRow>(
        `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND organization_id = $3
         RETURNING id, ticket_number, reporter_id, assigned_to, category, title,
           description, visibility, location, priority, status, created_at, updated_at`,
        [nextStatus, id, request.auth.organizationId],
      );
      await app.database.query(
        `INSERT INTO complaint_status_histories
          (id, organization_id, complaint_id, actor_id, from_status, to_status, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ulid(),
          request.auth.organizationId,
          id,
          request.auth.id,
          current.status,
          nextStatus,
          body.message?.trim() || null,
        ],
      );
      await app.database.query(
        `INSERT INTO notifications
          (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
         VALUES ($1, $2, $3, 'COMPLAINT_STATUS', 'Status pengaduan diperbarui', $4, $5, $6)
         ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
        [
          ulid(),
          request.auth.organizationId,
          current.reporter_id,
          body.message?.trim() || `Status ${current.ticket_number} kini ${nextStatus}.`,
          `/app/pengaduan/${id}`,
          `complaint-status:${id}:${nextStatus}`,
        ],
      );
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'complaint.status.change',
        entityType: 'complaint',
        entityId: id,
        requestId: request.id,
        before: { status: current.status },
        after: { status: nextStatus },
      });
      return success(request, mapComplaint(result.rows[0]!));
    },
  );
}
