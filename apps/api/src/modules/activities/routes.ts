import {
  activityCreateSchema,
  activityResponseSchema,
  pageQuerySchema,
} from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type ActivityRow = {
  id: string;
  coordinator_id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string | Date;
  ends_at: string | Date;
  capacity: number | null;
  status: string;
};

function mapActivity(row: ActivityRow) {
  return {
    id: row.id,
    coordinatorId: row.coordinator_id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    capacity: row.capacity,
    status: row.status,
  };
}

async function activityById(app: FastifyInstance, id: string, organizationId: string) {
  const result = await app.database.query<ActivityRow>(
    `SELECT id, coordinator_id, title, description, location, starts_at, ends_at,
       capacity, status FROM activities WHERE id = $1 AND organization_id = $2`,
    [id, organizationId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Kegiatan tidak ditemukan.');
  return row;
}

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/activities',
    { preHandler: app.requirePermission('activity.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const result = await app.database.query<ActivityRow & { total_count: number | string }>(
        `SELECT id, coordinator_id, title, description, location, starts_at, ends_at,
           capacity, status, COUNT(*) OVER() AS total_count
         FROM activities WHERE organization_id = $1 AND status <> 'DRAFT'
         ORDER BY starts_at ASC LIMIT $2 OFFSET $3`,
        [request.auth?.organizationId, page.pageSize, (page.page - 1) * page.pageSize],
      );
      return success(request, result.rows.map(mapActivity), {
        page: page.page,
        pageSize: page.pageSize,
        total: Number(result.rows[0]?.total_count ?? 0),
      });
    },
  );

  app.post(
    '/activities',
    { preHandler: app.requirePermission('activity.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const input = activityCreateSchema.parse(request.body);
      if (new Date(input.endsAt) <= new Date(input.startsAt)) {
        throw new AppError(422, 'INVALID_ACTIVITY_TIME', 'Waktu selesai harus setelah waktu mulai.');
      }
      const id = ulid();
      const activity = await app.database.transaction(async (transaction) => {
        const result = await transaction.query<ActivityRow>(
          `INSERT INTO activities
            (id, organization_id, coordinator_id, title, description, location,
             starts_at, ends_at, capacity, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED')
           RETURNING id, coordinator_id, title, description, location, starts_at,
             ends_at, capacity, status`,
          [
            id,
            request.auth!.organizationId,
            request.auth!.id,
            input.title,
            input.description,
            input.location,
            input.startsAt,
            input.endsAt,
            input.capacity ?? null,
          ],
        );
        for (const need of input.needs) {
          await transaction.query(
            `INSERT INTO activity_needs
              (id, organization_id, activity_id, contribution_type, target)
             VALUES ($1, $2, $3, $4, $5)`,
            [ulid(), request.auth!.organizationId, id, need.type, need.target],
          );
        }
        return result.rows[0]!;
      });
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'activity.create',
        entityType: 'activity',
        entityId: id,
        requestId: request.id,
        after: { title: input.title, needs: input.needs },
      });
      return reply.status(201).send(success(request, mapActivity(activity)));
    },
  );

  app.get(
    '/activities/:id',
    { preHandler: app.requirePermission('activity.read') },
    async (request) => {
      const { id } = request.params as { id: string };
      const activity = await activityById(app, id, request.auth?.organizationId ?? '');
      const needs = await app.database.query<{
        contribution_type: string;
        target: number;
        committed: number | string;
      }>(
        `SELECT n.contribution_type, n.target, COALESCE(SUM(r.quantity), 0) AS committed
         FROM activity_needs n
         LEFT JOIN activity_responses r
           ON r.activity_id = n.activity_id
          AND r.contribution_type = n.contribution_type
          AND r.organization_id = n.organization_id
         WHERE n.activity_id = $1 AND n.organization_id = $2
         GROUP BY n.id, n.contribution_type, n.target ORDER BY n.contribution_type`,
        [id, request.auth?.organizationId],
      );
      return success(request, {
        ...mapActivity(activity),
        needs: needs.rows.map((need) => {
          const committed = Number(need.committed);
          return {
            type: need.contribution_type,
            target: need.target,
            committed,
            remaining: Math.max(0, need.target - committed),
          };
        }),
      });
    },
  );

  app.post(
    '/activities/:id/responses',
    { preHandler: app.requirePermission('activity.read') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const input = activityResponseSchema.parse(request.body);
      await activityById(app, id, request.auth.organizationId);
      const result = await app.database.query<{
        contribution_type: string;
        quantity: number;
        note: string | null;
      }>(
        `INSERT INTO activity_responses
          (id, organization_id, activity_id, user_id, contribution_type, quantity, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, activity_id, user_id)
         DO UPDATE SET contribution_type = EXCLUDED.contribution_type,
           quantity = EXCLUDED.quantity, note = EXCLUDED.note, created_at = CURRENT_TIMESTAMP
         RETURNING contribution_type, quantity, note`,
        [
          ulid(),
          request.auth.organizationId,
          id,
          request.auth.id,
          input.contributionType,
          input.quantity,
          input.note ?? null,
        ],
      );
      return success(request, {
        contributionType: result.rows[0]!.contribution_type,
        quantity: result.rows[0]!.quantity,
        note: result.rows[0]!.note,
      });
    },
  );
}
