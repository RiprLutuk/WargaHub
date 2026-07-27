import { pageQuerySchema } from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { success } from '../../lib/http.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/audit-logs',
    { preHandler: app.requirePermission('audit_log.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const result = await app.database.query<{
        id: string;
        actor_id: string | null;
        actor_name: string | null;
        actor_email: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        request_id: string;
        before_value: unknown;
        after_value: unknown;
        created_at: string | Date;
        total_count: number | string;
      }>(
        `SELECT a.id, a.actor_id, u.name AS actor_name, u.email AS actor_email,
                a.action, a.entity_type, a.entity_id, a.request_id,
                a.before_value, a.after_value, a.created_at, COUNT(*) OVER() AS total_count
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.organization_id = $1
         ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [
          request.auth?.organizationId,
          page.pageSize,
          (page.page - 1) * page.pageSize,
        ],
      );
      return success(
        request,
        result.rows.map((row) => ({
          id: row.id,
          actorId: row.actor_id,
          actorName: row.actor_name ?? row.actor_email ?? (row.actor_id ? `Warga (${row.actor_id.slice(-6)})` : 'Sistem / Publik'),
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          requestId: row.request_id,
          before: row.before_value,
          after: row.after_value,
          createdAt: new Date(row.created_at).toISOString(),
        })),
        {
          page: page.page,
          pageSize: page.pageSize,
          total: Number(result.rows[0]?.total_count ?? 0),
        },
      );
    },
  );
}
