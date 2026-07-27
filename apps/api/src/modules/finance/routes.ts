import { pageQuerySchema } from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { AppError, success } from '../../lib/http.js';
import {
  cashBalance,
  mapFinance,
  postFinanceTransaction,
  reverseFinanceTransaction,
} from './service.js';

type FinanceRow = Parameters<typeof mapFinance>[0];

function csvCell(value: string | number): string {
  const stringValue = String(value);
  const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/finance/transactions',
    { preHandler: app.requirePermission('finance.read') },
    async (request) => {
      const page = pageQuerySchema.parse(request.query);
      const result = await app.database.query<FinanceRow & { total_count: number | string }>(
        `SELECT id, organization_id, kind, category, description, amount, status,
           occurred_at, reversal_of_id, COUNT(*) OVER() AS total_count
         FROM finance_transactions WHERE organization_id = $1
         ORDER BY occurred_at DESC LIMIT $2 OFFSET $3`,
        [
          request.auth?.organizationId,
          page.pageSize,
          (page.page - 1) * page.pageSize,
        ],
      );
      return success(request, result.rows.map(mapFinance), {
        page: page.page,
        pageSize: page.pageSize,
        total: Number(result.rows[0]?.total_count ?? 0),
      });
    },
  );

  app.get(
    '/finance/balance',
    { preHandler: app.requirePermission('finance.read') },
    async (request) =>
      success(request, {
        balance: await cashBalance(app.database, request.auth?.organizationId ?? ''),
        currency: 'IDR',
      }),
  );

  app.post(
    '/finance/transactions',
    { preHandler: app.requirePermission('finance.create') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const transaction = await postFinanceTransaction(
        app.database,
        request.auth,
        request.body,
      );
      return reply.status(201).send(success(request, transaction));
    },
  );

  app.post(
    '/finance/transactions/:id/reverse',
    { preHandler: app.requirePermission('finance.create') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const reversal = await reverseFinanceTransaction(
        app.database,
        request.auth,
        id,
        reason ?? '',
        request.id,
      );
      return success(request, reversal);
    },
  );

  app.get(
    '/finance/export.csv',
    { preHandler: app.requirePermission('finance.read') },
    async (request, reply) => {
      const result = await app.database.query<FinanceRow>(
        `SELECT id, organization_id, kind, category, description, amount, status,
           occurred_at, reversal_of_id FROM finance_transactions
         WHERE organization_id = $1 ORDER BY occurred_at DESC`,
        [request.auth?.organizationId],
      );
      const rows = [
        ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Nominal', 'Status'],
        ...result.rows.map((row) => {
          const item = mapFinance(row);
          return [
            item.occurredAt,
            item.kind,
            item.category,
            item.description,
            item.amount,
            item.status,
          ];
        }),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
      return reply
        .type('text/csv; charset=utf-8')
        .header('content-disposition', 'attachment; filename="laporan-kas.csv"')
        .send(csv);
    },
  );
}
