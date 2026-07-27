import type { FastifyInstance } from 'fastify';
import { success } from '../../lib/http.js';
import { mapBill } from '../billing/service.js';

type BillRow = Parameters<typeof mapBill>[0];

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dashboard', { preHandler: app.authenticate }, async (request) => {
    const householdIds = request.auth?.householdIds ?? [];
    let obligations: ReturnType<typeof mapBill>[] = [];
    if (householdIds.length > 0) {
      const values: unknown[] = [request.auth?.organizationId];
      const placeholders = householdIds.map((id) => {
        values.push(id);
        return `$${values.length}`;
      });
      const bills = await app.database.query<BillRow>(
        `SELECT id, organization_id, household_id, title, description, period, kind,
           recurrence, amount, amount_paid, due_at, status
         FROM bills WHERE organization_id = $1
           AND household_id IN (${placeholders.join(', ')})
           AND status IN ('OPEN', 'PARTIALLY_PAID')
         ORDER BY due_at ASC LIMIT 5`,
        values,
      );
      obligations = bills.rows.map(mapBill);
    }

    const [announcements, patrol, complaints, activities, notifications] =
      await Promise.all([
        app.database.query<{
          id: string;
          title: string;
          summary: string;
          urgency: string;
          published_at: string | Date;
        }>(
          `SELECT id, title, summary, urgency, published_at FROM announcements
           WHERE organization_id = $1 AND status = 'PUBLISHED'
             AND visibility IN ('PUBLIC', 'RESIDENT')
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           ORDER BY pinned DESC, published_at DESC LIMIT 4`,
          [request.auth?.organizationId],
        ),
        app.database.query<{ id: string; starts_at: string | Date; area: string }>(
          `SELECT id, starts_at, area FROM patrol_assignments
           WHERE organization_id = $1 AND user_id = $2
             AND starts_at >= CURRENT_TIMESTAMP AND status IN ('SCHEDULED', 'SWAP_PENDING')
           ORDER BY starts_at ASC LIMIT 3`,
          [request.auth?.organizationId, request.auth?.id],
        ),
        app.database.query<{ id: string; ticket_number: string; title: string; status: string }>(
          `SELECT id, ticket_number, title, status FROM complaints
           WHERE organization_id = $1 AND reporter_id = $2
             AND status NOT IN ('CLOSED', 'REJECTED')
           ORDER BY updated_at DESC LIMIT 3`,
          [request.auth?.organizationId, request.auth?.id],
        ),
        app.database.query<{ id: string; title: string; starts_at: string | Date }>(
          `SELECT id, title, starts_at FROM activities
           WHERE organization_id = $1 AND status = 'PUBLISHED'
             AND starts_at >= CURRENT_TIMESTAMP ORDER BY starts_at ASC LIMIT 3`,
          [request.auth?.organizationId],
        ),
        app.database.query<{ count: number | string }>(
          `SELECT COUNT(*) AS count FROM notifications
           WHERE organization_id = $1 AND user_id = $2 AND read_at IS NULL`,
          [request.auth?.organizationId, request.auth?.id],
        ),
      ]);

    return success(request, {
      obligations,
      announcements: announcements.rows.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        urgency: item.urgency,
        publishedAt: new Date(item.published_at).toISOString(),
      })),
      patrol: patrol.rows.map((item) => ({
        id: item.id,
        startsAt: new Date(item.starts_at).toISOString(),
        area: item.area,
      })),
      complaints: complaints.rows.map((item) => ({
        id: item.id,
        ticketNumber: item.ticket_number,
        title: item.title,
        status: item.status,
      })),
      activities: activities.rows.map((item) => ({
        id: item.id,
        title: item.title,
        startsAt: new Date(item.starts_at).toISOString(),
      })),
      unreadNotifications: Number(notifications.rows[0]?.count ?? 0),
    });
  });

  app.get(
    '/admin/dashboard',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      const result = await app.database.query<Record<string, number | string>>(
        `SELECT
          (SELECT COUNT(*) FROM households WHERE organization_id = $1) AS households,
          (SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'ACTIVE') AS active_users,
          (SELECT COUNT(*) FROM payments WHERE organization_id = $1 AND status = 'PENDING_VERIFICATION') AS pending_payments,
          (SELECT COUNT(*) FROM complaints WHERE organization_id = $1 AND status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED')) AS open_complaints,
          (SELECT COUNT(*) FROM complaints WHERE organization_id = $1 AND due_at < CURRENT_TIMESTAMP AND status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED')) AS overdue_sla,
          (SELECT COUNT(*) FROM activities WHERE organization_id = $1 AND status = 'PUBLISHED' AND starts_at >= CURRENT_TIMESTAMP) AS upcoming_activities,
          (SELECT COUNT(*) FROM patrol_assignments WHERE organization_id = $1 AND status = 'SWAP_PENDING') AS pending_patrol_swaps,
          (SELECT COALESCE(SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE -amount END), 0)
             FROM finance_transactions WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')) AS cash_balance`,
        [request.auth?.organizationId],
      );
      const metrics = result.rows[0] ?? {};
      return success(
        request,
        Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Number(value)])),
      );
    },
  );
}
