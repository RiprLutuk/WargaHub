import {
  billCreateSchema,
  paymentCreateSchema,
  type SafeUser,
} from '@wargahub/contracts';
import { ulid } from 'ulidx';
import type { Database } from '../../db/client.js';
import { AppError } from '../../lib/http.js';
import { hasPermission } from '../../lib/policy.js';
import { recordAudit } from '../audit/service.js';

export type Bill = {
  id: string;
  organizationId: string;
  householdId: string;
  title: string;
  description: string;
  period: string;
  kind: 'MANDATORY' | 'VOLUNTARY' | 'DONATION';
  recurrence: 'ONE_TIME' | 'MONTHLY';
  amount: number;
  amountPaid: number;
  dueAt: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'VOID';
};

export type Payment = {
  id: string;
  organizationId: string;
  billId: string;
  householdId: string;
  submittedBy: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'CASH';
  proofFileId: string | null;
  note: string | null;
  status: 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED';
  submittedAt: string;
  verifiedAt: string | null;
};

type BillRow = {
  id: string;
  organization_id: string;
  household_id: string;
  title: string;
  description: string;
  period: string;
  kind: Bill['kind'];
  recurrence: Bill['recurrence'];
  amount: number | string | bigint;
  amount_paid: number | string | bigint;
  due_at: string | Date;
  status: Bill['status'];
};

type PaymentRow = {
  id: string;
  organization_id: string;
  bill_id: string;
  household_id: string;
  submitted_by: string;
  proof_file_id: string | null;
  amount: number | string | bigint;
  method: Payment['method'];
  note: string | null;
  status: Payment['status'];
  submitted_at: string | Date;
  verified_at: string | Date | null;
};

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapBill(row: BillRow): Bill {
  return {
    id: row.id,
    organizationId: row.organization_id,
    householdId: row.household_id,
    title: row.title,
    description: row.description,
    period: row.period,
    kind: row.kind,
    recurrence: row.recurrence,
    amount: Number(row.amount),
    amountPaid: Number(row.amount_paid),
    dueAt: iso(row.due_at),
    status: row.status,
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    billId: row.bill_id,
    householdId: row.household_id,
    submittedBy: row.submitted_by,
    amount: Number(row.amount),
    method: row.method,
    proofFileId: row.proof_file_id,
    note: row.note,
    status: row.status,
    submittedAt: iso(row.submitted_at),
    verifiedAt: row.verified_at ? iso(row.verified_at) : null,
  };
}

function idempotentPayment(
  previous: PaymentRow,
  actor: SafeUser,
  bill: BillRow,
  input: {
    amount: number;
    method: Payment['method'];
    proofFileId?: string | undefined;
    note?: string | undefined;
  },
): Payment {
  if (
    previous.bill_id !== bill.id ||
    previous.household_id !== bill.household_id ||
    previous.submitted_by !== actor.id ||
    Number(previous.amount) !== input.amount ||
    previous.method !== input.method ||
    previous.proof_file_id !== (input.proofFileId ?? null) ||
    previous.note !== (input.note ?? null)
  ) {
    throw new AppError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'Kunci idempotensi sudah dipakai untuk permintaan pembayaran lain.',
    );
  }
  return mapPayment(previous);
}

export async function createBill(
  database: Database,
  actor: SafeUser,
  rawInput: unknown,
): Promise<Bill> {
  if (!hasPermission(actor.permissions, 'billing.create')) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat membuat tagihan.');
  }
  const input = billCreateSchema.parse(rawInput);
  const household = await database.query<{ id: string }>(
    'SELECT id FROM households WHERE id = $1 AND organization_id = $2',
    [input.householdId, actor.organizationId],
  );
  if (!household.rows[0]) throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');

  const id = ulid();
  const result = await database.query<BillRow>(
    `INSERT INTO bills
      (id, organization_id, household_id, created_by, title, description, period,
       kind, recurrence, amount, due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, organization_id, household_id, title, description, period,
       kind, recurrence, amount, amount_paid, due_at, status`,
    [
      id,
      actor.organizationId,
      input.householdId,
      actor.id,
      input.title,
      input.description,
      input.period,
      input.kind,
      input.recurrence,
      input.amount,
      input.dueAt,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(500, 'BILL_CREATE_FAILED', 'Tagihan gagal dibuat.');
  return mapBill(row);
}

export async function createPayment(
  database: Database,
  actor: SafeUser,
  billId: string,
  rawInput: unknown,
): Promise<Payment> {
  const input = paymentCreateSchema.parse(rawInput);
  const bills = await database.query<BillRow>(
    `SELECT id, organization_id, household_id, title, description, period,
       kind, recurrence, amount, amount_paid, due_at, status
     FROM bills WHERE id = $1 AND organization_id = $2`,
    [billId, actor.organizationId],
  );
  const bill = bills.rows[0];
  if (!bill || !actor.householdIds.includes(bill.household_id)) {
    throw new AppError(404, 'BILL_NOT_FOUND', 'Tagihan tidak ditemukan.');
  }

  const existing = await database.query<PaymentRow>(
    `SELECT id, organization_id, bill_id, household_id, submitted_by, proof_file_id,
       amount, method, note, status, submitted_at, verified_at
     FROM payments WHERE organization_id = $1 AND idempotency_key = $2`,
    [actor.organizationId, input.idempotencyKey],
  );
  const previous = existing.rows[0];
  if (previous) return idempotentPayment(previous, actor, bill, input);

  if (input.proofFileId) {
    const proof = await database.query<{ id: string }>(
      `SELECT f.id FROM files f
       WHERE f.id = $1 AND f.organization_id = $2 AND f.owner_user_id = $3
         AND f.visibility = 'PRIVATE'
         AND NOT EXISTS (
           SELECT 1 FROM payments p
           WHERE p.organization_id = f.organization_id AND p.proof_file_id = f.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM document_versions dv
           WHERE dv.organization_id = f.organization_id AND dv.file_id = f.id
         )`,
      [input.proofFileId, actor.organizationId, actor.id],
    );
    if (!proof.rows[0]) {
      throw new AppError(
        422,
        'INVALID_PAYMENT_PROOF',
        'Bukti pembayaran tidak tersedia atau bukan milik Anda.',
      );
    }
  }

  if (!['OPEN', 'PARTIALLY_PAID'].includes(bill.status)) {
    throw new AppError(409, 'BILL_NOT_PAYABLE', 'Tagihan ini tidak dapat dibayar.');
  }
  if (input.amount > Number(bill.amount) - Number(bill.amount_paid)) {
    throw new AppError(
      409,
      'PAYMENT_EXCEEDS_OUTSTANDING',
      'Nominal pembayaran melebihi sisa tagihan.',
    );
  }

  const id = ulid();
  const result = await database.query<PaymentRow>(
    `INSERT INTO payments
     (id, organization_id, bill_id, household_id, submitted_by, proof_file_id,
       idempotency_key, method, amount, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (organization_id, idempotency_key) DO NOTHING
     RETURNING id, organization_id, bill_id, household_id, submitted_by,
       proof_file_id, amount, method, note, status, submitted_at, verified_at`,
    [
      id,
      actor.organizationId,
      bill.id,
      bill.household_id,
      actor.id,
      input.proofFileId ?? null,
      input.idempotencyKey,
      input.method,
      input.amount,
      input.note ?? null,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    const concurrent = await database.query<PaymentRow>(
      `SELECT id, organization_id, bill_id, household_id, submitted_by,
         proof_file_id, amount, method, note, status, submitted_at, verified_at
       FROM payments WHERE organization_id = $1 AND idempotency_key = $2`,
      [actor.organizationId, input.idempotencyKey],
    );
    if (!concurrent.rows[0]) {
      throw new AppError(500, 'PAYMENT_CREATE_FAILED', 'Pembayaran gagal dicatat.');
    }
    return idempotentPayment(concurrent.rows[0], actor, bill, input);
  }
  return mapPayment(row);
}

export async function verifyPayment(
  database: Database,
  actor: SafeUser,
  paymentId: string,
  requestId: string,
): Promise<Payment> {
  if (!hasPermission(actor.permissions, 'billing.reconcile')) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat memverifikasi pembayaran.');
  }

  return database.transaction(async (transaction) => {
    const records = await transaction.query<
      PaymentRow & {
        bill_title: string;
        bill_amount: number | string | bigint;
        bill_amount_paid: number | string | bigint;
      }
    >(
      `SELECT p.id, p.organization_id, p.bill_id, p.household_id, p.submitted_by,
         p.proof_file_id, p.amount, p.method, p.note, p.status, p.submitted_at, p.verified_at,
         b.title AS bill_title, b.amount AS bill_amount,
         b.amount_paid AS bill_amount_paid
       FROM payments p JOIN bills b ON b.id = p.bill_id
       WHERE p.id = $1 AND p.organization_id = $2 FOR UPDATE OF p, b`,
      [paymentId, actor.organizationId],
    );
    const payment = records.rows[0];
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pembayaran tidak ditemukan.');
    if (payment.status !== 'PENDING_VERIFICATION') {
      throw new AppError(
        409,
        'PAYMENT_ALREADY_VERIFIED',
        'Pembayaran sudah pernah diperiksa.',
      );
    }
    const outstanding = Number(payment.bill_amount) - Number(payment.bill_amount_paid);
    if (Number(payment.amount) > outstanding) {
      throw new AppError(
        409,
        'PAYMENT_EXCEEDS_OUTSTANDING',
        'Pembayaran melebihi sisa tagihan dan belum dapat diverifikasi.',
      );
    }

    const updated = await transaction.query<PaymentRow>(
      `UPDATE payments SET status = 'PAID', verified_by = $1,
         verified_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3 AND status = 'PENDING_VERIFICATION'
       RETURNING id, organization_id, bill_id, household_id, submitted_by,
         proof_file_id, amount, method, note, status, submitted_at, verified_at`,
      [actor.id, payment.id, actor.organizationId],
    );
    if (updated.rowCount !== 1 || !updated.rows[0]) {
      throw new AppError(409, 'PAYMENT_ALREADY_VERIFIED', 'Pembayaran sudah pernah diperiksa.');
    }
    const allocated = await transaction.query<{ id: string }>(
      `UPDATE bills
       SET amount_paid = amount_paid + $1,
           status = CASE
             WHEN amount_paid + $1 >= amount THEN 'PAID'
             ELSE 'PARTIALLY_PAID'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3 AND amount_paid + $1 <= amount
       RETURNING id`,
      [Number(payment.amount), payment.bill_id, actor.organizationId],
    );
    if (allocated.rowCount !== 1) {
      throw new AppError(
        409,
        'PAYMENT_EXCEEDS_OUTSTANDING',
        'Pembayaran melebihi sisa tagihan dan belum dapat diverifikasi.',
      );
    }
    const cash = await transaction.query<{ id: string }>(
      `SELECT id FROM cash_accounts
       WHERE organization_id = $1 AND active = TRUE ORDER BY name LIMIT 1`,
      [actor.organizationId],
    );
    if (!cash.rows[0]) throw new AppError(409, 'CASH_ACCOUNT_REQUIRED', 'Akun kas belum tersedia.');
    await transaction.query(
      `INSERT INTO finance_transactions
        (id, organization_id, cash_account_id, created_by, reviewed_by, payment_id,
         kind, category, description, amount, status, occurred_at)
       VALUES ($1, $2, $3, $4, $4, $5, 'INCOME', 'Iuran', $6, $7, 'POSTED', CURRENT_TIMESTAMP)`,
      [
        ulid(),
        actor.organizationId,
        cash.rows[0].id,
        actor.id,
        payment.id,
        `Pembayaran ${payment.bill_title}`,
        Number(payment.amount),
      ],
    );
    await transaction.query(
      `INSERT INTO notifications
        (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
       VALUES ($1, $2, $3, 'PAYMENT_VERIFIED', 'Pembayaran sudah diperiksa',
         $4, $5, $6) ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
      [
        ulid(),
        actor.organizationId,
        payment.submitted_by,
        `${payment.bill_title} telah dinyatakan lunas.`,
        `/app/tagihan/${payment.bill_id}`,
        `payment-verified:${payment.id}`,
      ],
    );
    await recordAudit(transaction, {
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: 'payment.verify',
      entityType: 'payment',
      entityId: payment.id,
      requestId,
      before: { status: payment.status },
      after: { status: 'PAID', amount: Number(payment.amount) },
    });
    return mapPayment(updated.rows[0]);
  });
}

export async function rejectPayment(
  database: Database,
  actor: SafeUser,
  paymentId: string,
  reason: string,
  requestId: string,
): Promise<Payment> {
  if (!hasPermission(actor.permissions, 'billing.reconcile')) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat memeriksa pembayaran.');
  }
  if (reason.trim().length < 5) {
    throw new AppError(422, 'REASON_REQUIRED', 'Jelaskan alasan penolakan.');
  }
  const updated = await database.query<PaymentRow>(
    `UPDATE payments SET status = 'REJECTED', verified_by = $1,
       verified_at = CURRENT_TIMESTAMP, rejection_reason = $2
     WHERE id = $3 AND organization_id = $4 AND status = 'PENDING_VERIFICATION'
     RETURNING id, organization_id, bill_id, household_id, submitted_by,
       proof_file_id, amount, method, note, status, submitted_at, verified_at`,
    [actor.id, reason.trim(), paymentId, actor.organizationId],
  );
  if (!updated.rows[0]) {
    throw new AppError(409, 'PAYMENT_ALREADY_VERIFIED', 'Pembayaran sudah pernah diperiksa.');
  }
  await recordAudit(database, {
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: 'payment.reject',
    entityType: 'payment',
    entityId: paymentId,
    requestId,
    after: { status: 'REJECTED', reason },
  });
  return mapPayment(updated.rows[0]);
}

export { mapBill, mapPayment };
