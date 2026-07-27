import {
  financeTransactionCreateSchema,
  type SafeUser,
} from '@wargahub/contracts';
import { ulid } from 'ulidx';
import type { Database } from '../../db/client.js';
import { AppError } from '../../lib/http.js';
import { hasPermission } from '../../lib/policy.js';
import { recordAudit } from '../audit/service.js';

export type FinanceTransaction = {
  id: string;
  organizationId: string;
  kind: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  status: 'DRAFT' | 'REVIEWED' | 'POSTED' | 'REVERSED';
  occurredAt: string;
  reversalOfId: string | null;
};

type FinanceRow = {
  id: string;
  organization_id: string;
  kind: FinanceTransaction['kind'];
  category: string;
  description: string;
  amount: number | string | bigint;
  status: FinanceTransaction['status'];
  occurred_at: string | Date;
  reversal_of_id: string | null;
};

function mapFinance(row: FinanceRow): FinanceTransaction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    kind: row.kind,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    occurredAt: new Date(row.occurred_at).toISOString(),
    reversalOfId: row.reversal_of_id,
  };
}

export async function postFinanceTransaction(
  database: Database,
  actor: SafeUser,
  rawInput: unknown,
): Promise<FinanceTransaction> {
  if (!hasPermission(actor.permissions, 'finance.create')) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat mencatat transaksi.');
  }
  const input = financeTransactionCreateSchema.parse(rawInput);
  const cash = await database.query<{ id: string }>(
    'SELECT id FROM cash_accounts WHERE organization_id = $1 AND active = TRUE ORDER BY name LIMIT 1',
    [actor.organizationId],
  );
  if (!cash.rows[0]) throw new AppError(409, 'CASH_ACCOUNT_REQUIRED', 'Akun kas belum tersedia.');
  const result = await database.query<FinanceRow>(
    `INSERT INTO finance_transactions
      (id, organization_id, cash_account_id, created_by, reviewed_by, kind,
       category, description, amount, status, occurred_at, proof_file_id)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, 'POSTED', $9, $10)
     RETURNING id, organization_id, kind, category, description, amount, status,
       occurred_at, reversal_of_id`,
    [
      ulid(),
      actor.organizationId,
      cash.rows[0].id,
      actor.id,
      input.kind,
      input.category,
      input.description,
      input.amount,
      input.occurredAt,
      input.proofFileId ?? null,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(500, 'FINANCE_CREATE_FAILED', 'Transaksi gagal dicatat.');
  return mapFinance(row);
}

export async function reverseFinanceTransaction(
  database: Database,
  actor: SafeUser,
  transactionId: string,
  reason: string,
  requestId: string,
): Promise<FinanceTransaction> {
  if (!hasPermission(actor.permissions, 'finance.create')) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat mengoreksi transaksi.');
  }
  if (reason.trim().length < 5) {
    throw new AppError(422, 'REASON_REQUIRED', 'Alasan koreksi perlu dijelaskan.');
  }

  return database.transaction(async (transaction) => {
    const result = await transaction.query<
      FinanceRow & { cash_account_id: string; payment_id: string | null }
    >(
      `SELECT id, organization_id, cash_account_id, payment_id, kind, category,
         description, amount, status, occurred_at, reversal_of_id
       FROM finance_transactions
       WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
      [transactionId, actor.organizationId],
    );
    const source = result.rows[0];
    if (!source) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan.');
    if (source.status !== 'POSTED' || source.reversal_of_id) {
      throw new AppError(409, 'TRANSACTION_NOT_REVERSIBLE', 'Transaksi sudah dikoreksi.');
    }
    if (source.payment_id) {
      throw new AppError(
        409,
        'PAYMENT_REVERSAL_REQUIRES_WORKFLOW',
        'Transaksi pembayaran harus dikoreksi melalui workflow pembayaran.',
      );
    }

    const reversed = await transaction.query<{ id: string }>(
      `UPDATE finance_transactions SET status = 'REVERSED'
       WHERE id = $1 AND status = 'POSTED' RETURNING id`,
      [source.id],
    );
    if (reversed.rowCount !== 1) {
      throw new AppError(409, 'TRANSACTION_NOT_REVERSIBLE', 'Transaksi sudah dikoreksi.');
    }
    const created = await transaction.query<FinanceRow>(
      `INSERT INTO finance_transactions
        (id, organization_id, cash_account_id, created_by, reviewed_by,
         reversal_of_id, kind, category, description, amount, status, occurred_at)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, 'POSTED', CURRENT_TIMESTAMP)
       RETURNING id, organization_id, kind, category, description, amount, status,
         occurred_at, reversal_of_id`,
      [
        ulid(),
        actor.organizationId,
        source.cash_account_id,
        actor.id,
        source.id,
        source.kind === 'INCOME' ? 'EXPENSE' : 'INCOME',
        source.category,
        `Reversal: ${reason.trim()}`,
        Number(source.amount),
      ],
    );
    const row = created.rows[0];
    if (!row) throw new AppError(500, 'REVERSAL_FAILED', 'Koreksi gagal dicatat.');
    await recordAudit(transaction, {
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: 'finance.reverse',
      entityType: 'finance_transaction',
      entityId: source.id,
      requestId,
      before: { status: source.status },
      after: { status: 'REVERSED', reversalId: row.id, reason: reason.trim() },
    });
    return mapFinance(row);
  });
}

export async function cashBalance(
  database: Database,
  organizationId: string,
): Promise<number> {
  const result = await database.query<{ balance: number | string | bigint }>(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE -amount END), 0) AS balance
     FROM finance_transactions
     WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')`,
    [organizationId],
  );
  return Number(result.rows[0]?.balance ?? 0);
}

export { mapFinance };
