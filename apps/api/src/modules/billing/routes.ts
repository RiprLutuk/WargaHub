import { pageQuerySchema } from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { AppError, success } from '../../lib/http.js';
import {
  createBill,
  createPayment,
  mapBill,
  mapPayment,
  rejectPayment,
  verifyPayment,
  type Bill,
  type Payment,
} from './service.js';

type BillRow = Parameters<typeof mapBill>[0];
type PaymentRow = Parameters<typeof mapPayment>[0];

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/bills',
    { preHandler: app.requirePermission('billing.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const elevated = request.auth?.permissions.includes('billing.create') ?? false;
      const householdIds = request.auth?.householdIds ?? [];
      if (!elevated && householdIds.length === 0) {
        return success(request, [] as Bill[], {
          page: page.page,
          pageSize: page.pageSize,
          total: 0,
        });
      }
      const values: unknown[] = [request.auth?.organizationId];
      let scope = '';
      if (!elevated) {
        const placeholders = householdIds.map((id) => {
          values.push(id);
          return `$${values.length}`;
        });
        scope = ` AND household_id IN (${placeholders.join(', ')})`;
      }
      if (page.search) {
        values.push(`%${page.search}%`);
        scope += ` AND (title ILIKE $${values.length} OR period ILIKE $${values.length})`;
      }
      values.push(page.pageSize, (page.page - 1) * page.pageSize);
      const result = await app.database.query<BillRow & { total_count: number | string }>(
        `SELECT b.id, b.organization_id, b.household_id, b.title, b.description, b.period, b.kind,
           b.recurrence, b.amount, b.amount_paid, b.due_at,
           CASE 
             WHEN b.status = 'OPEN' AND EXISTS (
               SELECT 1 FROM payments p WHERE p.bill_id = b.id AND p.status = 'PENDING_VERIFICATION'
             ) THEN 'PENDING_VERIFICATION'
             ELSE b.status
           END AS status,
           COUNT(*) OVER() AS total_count
         FROM bills b WHERE b.organization_id = $1${scope}
         ORDER BY b.due_at ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return success(request, result.rows.map(mapBill), {
        page: page.page,
        pageSize: page.pageSize,
        total: Number(result.rows[0]?.total_count ?? 0),
      });
    },
  );

  app.get(
    '/bills/:id',
    { preHandler: app.requirePermission('billing.read') },
    async (request) => {
      const { id } = request.params as { id: string };
      const result = await app.database.query<BillRow>(
        `SELECT b.id, b.organization_id, b.household_id, b.title, b.description, b.period, b.kind,
           b.recurrence, b.amount, b.amount_paid, b.due_at,
           CASE 
             WHEN b.status = 'OPEN' AND EXISTS (
               SELECT 1 FROM payments p WHERE p.bill_id = b.id AND p.status = 'PENDING_VERIFICATION'
             ) THEN 'PENDING_VERIFICATION'
             ELSE b.status
           END AS status
         FROM bills b WHERE b.id = $1 AND b.organization_id = $2`,
        [id, request.auth?.organizationId],
      );
      const row = result.rows[0];
      const elevated = request.auth?.permissions.includes('billing.create') ?? false;
      if (!row || (!elevated && !request.auth?.householdIds.includes(row.household_id))) {
        throw new AppError(404, 'BILL_NOT_FOUND', 'Tagihan tidak ditemukan.');
      }
      return success(request, mapBill(row));
    },
  );

  app.post(
    '/bills',
    { preHandler: app.requirePermission('billing.create') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const bill = await createBill(app.database, request.auth, request.body);
      return reply.status(201).send(success(request, bill));
    },
  );

  app.post(
    '/bills/:id/payments',
    { preHandler: app.requirePermission('billing.read') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey !== 'string') {
        throw new AppError(422, 'IDEMPOTENCY_KEY_REQUIRED', 'Kunci idempotensi diperlukan.');
      }
      const body = request.body as Record<string, unknown>;
      const payment = await createPayment(app.database, request.auth, id, {
        ...body,
        idempotencyKey,
      });
      return reply.status(201).send(success(request, payment));
    },
  );

  app.get(
    '/payments',
    { preHandler: app.requirePermission('billing.reconcile') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const result = await app.database.query<PaymentRow & { total_count: number | string }>(
        `SELECT id, organization_id, bill_id, household_id, submitted_by,
           proof_file_id, amount, method, note, status, submitted_at, verified_at,
           COUNT(*) OVER() AS total_count
         FROM payments WHERE organization_id = $1
         ORDER BY submitted_at DESC LIMIT $2 OFFSET $3`,
        [
          request.auth?.organizationId,
          page.pageSize,
          (page.page - 1) * page.pageSize,
        ],
      );
      return success(request, result.rows.map(mapPayment), {
        page: page.page,
        pageSize: page.pageSize,
        total: Number(result.rows[0]?.total_count ?? 0),
      });
    },
  );

  app.post(
    '/payments/:id/verify',
    { preHandler: app.requirePermission('billing.reconcile') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const payment = await verifyPayment(app.database, request.auth, id, request.id);
      return success(request, payment);
    },
  );

  app.post(
    '/payments/:id/reject',
    { preHandler: app.requirePermission('billing.reconcile') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const payment = await rejectPayment(
        app.database,
        request.auth,
        id,
        reason ?? '',
        request.id,
      );
      return success(request, payment);
    },
  );
}

export type { Bill, Payment };
