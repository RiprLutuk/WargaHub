import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';

const preferencesSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  digest: z.enum(['IMMEDIATE', 'DAILY', 'EMERGENCY_ONLY']),
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/notifications',
    { preHandler: app.requirePermission('notification.read') },
    async (request) => {
      const result = await app.database.query<{
        id: string;
        kind: string;
        title: string;
        message: string;
        action_url: string | null;
        read_at: string | Date | null;
        created_at: string | Date;
      }>(
        `SELECT id, kind, title, message, action_url, read_at, created_at
         FROM notifications WHERE organization_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 100`,
        [request.auth?.organizationId, request.auth?.id],
      );
      return success(
        request,
        result.rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          title: row.title,
          message: row.message,
          actionUrl: row.action_url,
          readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
          createdAt: new Date(row.created_at).toISOString(),
        })),
      );
    },
  );

  app.post(
    '/notifications/:id/read',
    { preHandler: app.requirePermission('notification.read') },
    async (request) => {
      app.requireCsrf(request);
      const { id } = request.params as { id: string };
      const result = await app.database.query<{ id: string }>(
        `UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = $1 AND organization_id = $2 AND user_id = $3 RETURNING id`,
        [id, request.auth?.organizationId, request.auth?.id],
      );
      if (!result.rows[0]) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan.');
      return success(request, { id, read: true });
    },
  );

  app.get(
    '/notification-preferences',
    { preHandler: app.requirePermission('notification.read') },
    async (request) => {
      const result = await app.database.query<{
        in_app: boolean;
        email: boolean;
        quiet_hours_start: string | null;
        quiet_hours_end: string | null;
        digest: string;
      }>(
        `SELECT in_app, email, quiet_hours_start::text, quiet_hours_end::text, digest
         FROM notification_preferences WHERE organization_id = $1 AND user_id = $2`,
        [request.auth?.organizationId, request.auth?.id],
      );
      const row = result.rows[0];
      return success(request, {
        inApp: row?.in_app ?? true,
        email: row?.email ?? true,
        quietHoursStart: row?.quiet_hours_start?.slice(0, 5) ?? null,
        quietHoursEnd: row?.quiet_hours_end?.slice(0, 5) ?? null,
        digest: row?.digest ?? 'IMMEDIATE',
      });
    },
  );

  app.put(
    '/notification-preferences',
    { preHandler: app.requirePermission('notification.read') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const input = preferencesSchema.parse(request.body);
      await app.database.query(
        `INSERT INTO notification_preferences
          (organization_id, user_id, in_app, email, quiet_hours_start,
           quiet_hours_end, digest)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, user_id)
         DO UPDATE SET in_app = EXCLUDED.in_app, email = EXCLUDED.email,
           quiet_hours_start = EXCLUDED.quiet_hours_start,
           quiet_hours_end = EXCLUDED.quiet_hours_end, digest = EXCLUDED.digest`,
        [
          request.auth.organizationId,
          request.auth.id,
          input.inApp,
          input.email,
          input.quietHoursStart,
          input.quietHoursEnd,
          input.digest,
        ],
      );
      return success(request, input);
    },
  );
}
