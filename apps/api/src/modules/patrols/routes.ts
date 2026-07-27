import {
  pageQuerySchema,
  patrolAssignmentCreateSchema,
  patrolSwapCreateSchema,
} from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type AssignmentRow = {
  id: string;
  user_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  area: string;
  status: string;
};

type SwapRow = {
  id: string;
  source_assignment_id: string;
  target_assignment_id: string;
  requester_id: string;
  target_user_id: string;
  status: string;
  reason: string;
};

function mapAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    userId: row.user_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    area: row.area,
    status: row.status,
  };
}

function mapSwap(row: SwapRow) {
  return {
    id: row.id,
    sourceAssignmentId: row.source_assignment_id,
    targetAssignmentId: row.target_assignment_id,
    requesterId: row.requester_id,
    targetUserId: row.target_user_id,
    status: row.status,
    reason: row.reason,
  };
}

export async function patrolRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/patrol-assignments',
    { preHandler: app.requirePermission('patrol.schedule.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const canManage = request.auth.permissions.includes('patrol.schedule.manage');
      const result = await app.database.query<AssignmentRow & { total_count: number | string }>(
        `SELECT id, user_id, starts_at, ends_at, area, status,
           COUNT(*) OVER() AS total_count
         FROM patrol_assignments
         WHERE organization_id = $1
           AND ($2 = TRUE OR user_id = $3)
         ORDER BY starts_at ASC LIMIT $4 OFFSET $5`,
        [
          request.auth.organizationId,
          canManage,
          request.auth.id,
          page.pageSize,
          (page.page - 1) * page.pageSize,
        ],
      );
      return success(request, result.rows.map(mapAssignment), {
        page: page.page,
        pageSize: page.pageSize,
        total: Number(result.rows[0]?.total_count ?? 0),
      });
    },
  );

  app.post(
    '/patrol-assignments',
    { preHandler: app.requirePermission('patrol.schedule.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const input = patrolAssignmentCreateSchema.parse(request.body);
      if (new Date(input.endsAt) <= new Date(input.startsAt)) {
        throw new AppError(422, 'INVALID_PATROL_TIME', 'Waktu selesai harus setelah waktu mulai.');
      }
      const user = await app.database.query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND status = 'ACTIVE'`,
        [input.userId, request.auth.organizationId],
      );
      if (!user.rows[0]) throw new AppError(404, 'USER_NOT_FOUND', 'Warga tidak ditemukan.');
      const result = await app.database.query<AssignmentRow>(
        `INSERT INTO patrol_assignments
          (id, organization_id, user_id, starts_at, ends_at, area)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, starts_at, ends_at, area, status`,
        [
          ulid(),
          request.auth.organizationId,
          input.userId,
          input.startsAt,
          input.endsAt,
          input.area,
        ],
      );
      return reply.status(201).send(success(request, mapAssignment(result.rows[0]!)));
    },
  );

  app.post(
    '/patrol-assignments/:id/swap-request',
    { preHandler: app.requirePermission('patrol.schedule.read') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const input = patrolSwapCreateSchema.parse(request.body);
      const result = await app.database.transaction(async (transaction) => {
        const assignments = await transaction.query<AssignmentRow>(
          `SELECT id, user_id, starts_at, ends_at, area, status
           FROM patrol_assignments
           WHERE organization_id = $1 AND id IN ($2, $3)
           ORDER BY id FOR UPDATE`,
          [request.auth!.organizationId, id, input.targetAssignmentId],
        );
        const source = assignments.rows.find((item) => item.id === id);
        const target = assignments.rows.find((item) => item.id === input.targetAssignmentId);
        if (!source || source.user_id !== request.auth!.id || !target) {
          throw new AppError(404, 'PATROL_ASSIGNMENT_NOT_FOUND', 'Jadwal ronda tidak ditemukan.');
        }
        if (
          source.id === target.id ||
          target.user_id === request.auth!.id ||
          source.status !== 'SCHEDULED' ||
          target.status !== 'SCHEDULED'
        ) {
          throw new AppError(409, 'PATROL_SWAP_NOT_ALLOWED', 'Jadwal ini tidak dapat ditukar.');
        }
        const reserved = await transaction.query(
          `UPDATE patrol_assignments SET status = 'SWAP_PENDING'
           WHERE organization_id = $1 AND id IN ($2, $3) AND status = 'SCHEDULED'`,
          [request.auth!.organizationId, source.id, target.id],
        );
        if (reserved.rowCount !== 2) {
          throw new AppError(409, 'PATROL_SWAP_NOT_ALLOWED', 'Jadwal ini sedang diproses.');
        }
        const swap = await transaction.query<SwapRow>(
          `INSERT INTO patrol_swap_requests
            (id, organization_id, source_assignment_id, target_assignment_id,
             requester_id, target_user_id, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, source_assignment_id, target_assignment_id, requester_id,
             target_user_id, status, reason`,
          [
            ulid(),
            request.auth!.organizationId,
            source.id,
            target.id,
            request.auth!.id,
            target.user_id,
            input.reason,
          ],
        );
        await transaction.query(
          `INSERT INTO notifications
            (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
           VALUES ($1, $2, $3, 'PATROL_SWAP', 'Permintaan tukar ronda', $4, '/app/ronda', $5)
           ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
          [
            ulid(),
            request.auth!.organizationId,
            target.user_id,
            'Seorang warga meminta bertukar jadwal ronda dengan Anda.',
            `patrol-swap-request:${swap.rows[0]!.id}`,
          ],
        );
        return swap.rows[0]!;
      });
      return reply.status(201).send(success(request, mapSwap(result)));
    },
  );

  app.post(
    '/patrol-swap-requests/:id/accept',
    { preHandler: app.requirePermission('patrol.schedule.read') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const accepted = await app.database.transaction(async (transaction) => {
        const swaps = await transaction.query<SwapRow>(
          `SELECT id, source_assignment_id, target_assignment_id, requester_id,
             target_user_id, status, reason
           FROM patrol_swap_requests
           WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
          [id, request.auth!.organizationId],
        );
        const swap = swaps.rows[0];
        if (!swap || swap.target_user_id !== request.auth!.id || swap.status !== 'REQUESTED') {
          throw new AppError(409, 'PATROL_SWAP_NOT_ACCEPTABLE', 'Permintaan tidak dapat diterima.');
        }
        const assignments = await transaction.query<AssignmentRow>(
          `SELECT id, user_id, starts_at, ends_at, area, status
           FROM patrol_assignments
           WHERE organization_id = $1 AND id IN ($2, $3)
           ORDER BY id FOR UPDATE`,
          [request.auth!.organizationId, swap.source_assignment_id, swap.target_assignment_id],
        );
        const source = assignments.rows.find((item) => item.id === swap.source_assignment_id);
        const target = assignments.rows.find((item) => item.id === swap.target_assignment_id);
        if (
          !source ||
          !target ||
          source.user_id !== swap.requester_id ||
          target.user_id !== swap.target_user_id ||
          source.status !== 'SWAP_PENDING' ||
          target.status !== 'SWAP_PENDING'
        ) {
          throw new AppError(409, 'PATROL_SWAP_NOT_ACCEPTABLE', 'Jadwal telah berubah.');
        }
        const result = await transaction.query<SwapRow>(
          `UPDATE patrol_swap_requests SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND organization_id = $2 AND status = 'REQUESTED'
           RETURNING id, source_assignment_id, target_assignment_id, requester_id,
             target_user_id, status, reason`,
          [swap.id, request.auth!.organizationId],
        );
        if (!result.rows[0]) {
          throw new AppError(409, 'PATROL_SWAP_NOT_ACCEPTABLE', 'Permintaan tidak dapat diterima.');
        }
        return result.rows[0];
      });
      return success(request, mapSwap(accepted));
    },
  );

  app.post(
    '/patrol-swap-requests/:id/approve',
    { preHandler: app.requirePermission('patrol.swap.approve') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const approved = await app.database.transaction(async (transaction) => {
        const swaps = await transaction.query<SwapRow>(
          `SELECT id, source_assignment_id, target_assignment_id, requester_id,
             target_user_id, status, reason
           FROM patrol_swap_requests
           WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
          [id, request.auth!.organizationId],
        );
        const swap = swaps.rows[0];
        if (!swap || swap.status !== 'ACCEPTED') {
          throw new AppError(409, 'PATROL_SWAP_NOT_APPROVABLE', 'Permintaan belum diterima pengganti.');
        }
        const assignments = await transaction.query<AssignmentRow>(
          `SELECT id, user_id, starts_at, ends_at, area, status
           FROM patrol_assignments WHERE organization_id = $1 AND id IN ($2, $3)
           ORDER BY id FOR UPDATE`,
          [request.auth!.organizationId, swap.source_assignment_id, swap.target_assignment_id],
        );
        const source = assignments.rows.find((item) => item.id === swap.source_assignment_id);
        const target = assignments.rows.find((item) => item.id === swap.target_assignment_id);
        if (
          !source ||
          !target ||
          source.user_id !== swap.requester_id ||
          target.user_id !== swap.target_user_id ||
          source.status !== 'SWAP_PENDING' ||
          target.status !== 'SWAP_PENDING'
        ) {
          throw new AppError(409, 'PATROL_SWAP_NOT_APPROVABLE', 'Jadwal telah berubah.');
        }
        const sourceUpdate = await transaction.query(
          `UPDATE patrol_assignments SET user_id = $1, status = 'SCHEDULED'
           WHERE id = $2 AND organization_id = $3 AND user_id = $4 AND status = 'SWAP_PENDING'`,
          [target.user_id, source.id, request.auth!.organizationId, swap.requester_id],
        );
        const targetUpdate = await transaction.query(
          `UPDATE patrol_assignments SET user_id = $1, status = 'SCHEDULED'
           WHERE id = $2 AND organization_id = $3 AND user_id = $4 AND status = 'SWAP_PENDING'`,
          [source.user_id, target.id, request.auth!.organizationId, swap.target_user_id],
        );
        if (sourceUpdate.rowCount !== 1 || targetUpdate.rowCount !== 1) {
          throw new AppError(409, 'PATROL_SWAP_NOT_APPROVABLE', 'Jadwal telah berubah.');
        }
        const updatedSwap = await transaction.query<SwapRow>(
          `UPDATE patrol_swap_requests SET status = 'APPROVED', approved_by = $1,
             updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'ACCEPTED'
           RETURNING id, source_assignment_id, target_assignment_id, requester_id,
             target_user_id, status, reason`,
          [request.auth!.id, swap.id],
        );
        if (!updatedSwap.rows[0]) {
          throw new AppError(409, 'PATROL_SWAP_NOT_APPROVABLE', 'Permintaan telah diproses.');
        }
        await recordAudit(transaction, {
          organizationId: request.auth!.organizationId,
          actorId: request.auth!.id,
          action: 'patrol.swap.approve',
          entityType: 'patrol_swap_request',
          entityId: swap.id,
          requestId: request.id,
          before: { status: swap.status },
          after: { status: 'APPROVED' },
        });
        return {
          swap: updatedSwap.rows[0]!,
          assignments: [
            { ...source, user_id: target.user_id, status: 'SCHEDULED' },
            { ...target, user_id: source.user_id, status: 'SCHEDULED' },
          ],
        };
      });
      return success(request, {
        ...mapSwap(approved.swap),
        assignments: approved.assignments.map(mapAssignment),
      });
    },
  );
}
