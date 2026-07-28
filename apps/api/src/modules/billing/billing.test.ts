import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { safeUserById } from '../../lib/auth.js';
import { demoIds, seedDemoData } from '../../seed.js';
import {
  createBill,
  createPayment,
  verifyPayment,
} from './service.js';
import {
  cashBalance,
  postFinanceTransaction,
  reverseFinanceTransaction,
} from '../finance/service.js';

describe('billing and immutable finance ledger', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
  }, 30000);

  afterEach(async () => {
    await database?.close();
  });

  it('allocates a manual payment and refuses double verification', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const resident = await safeUserById(database, demoIds.resident);
    const treasurer = await safeUserById(database, demoIds.treasurer);
    if (!admin || !resident || !treasurer) throw new Error('Demo users missing');

    const bill = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran lingkungan Juli',
      description: 'Operasional keamanan dan kebersihan bulan Juli.',
      period: '2026-07',
      dueAt: '2026-07-31T16:59:59.000Z',
      amount: 150_000,
      kind: 'MANDATORY',
      recurrence: 'MONTHLY',
    });
    const pending = await createPayment(database, resident, bill.id, {
      amount: 150_000,
      method: 'BANK_TRANSFER',
      idempotencyKey: 'payment-july-house-a',
    });
    const first = await verifyPayment(
      database,
      treasurer,
      pending.id,
      'request-verify-1',
    );

    expect(first.status).toBe('PAID');
    await expect(
      verifyPayment(database, treasurer, pending.id, 'request-verify-2'),
    ).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_VERIFIED' });
    const billAfter = await database.query<{ status: string; amount_paid: number }>(
      'SELECT status, amount_paid FROM bills WHERE id = $1',
      [bill.id],
    );
    expect(billAfter.rows[0]).toMatchObject({ status: 'PAID', amount_paid: 150_000 });
  });

  it('calculates balance from posted entries and reversals', async () => {
    const treasurer = await safeUserById(database, demoIds.treasurer);
    if (!treasurer) throw new Error('Demo treasurer missing');

    await postFinanceTransaction(database, treasurer, {
      kind: 'INCOME',
      category: 'Donasi',
      description: 'Donasi program taman',
      amount: 500_000,
      occurredAt: '2026-07-20T08:00:00.000Z',
    });
    const expense = await postFinanceTransaction(database, treasurer, {
      kind: 'EXPENSE',
      category: 'Kebersihan',
      description: 'Pembelian alat kebersihan',
      amount: 125_000,
      occurredAt: '2026-07-21T08:00:00.000Z',
    });

    expect(await cashBalance(database, demoIds.organization)).toBe(375_000);
    await reverseFinanceTransaction(
      database,
      treasurer,
      expense.id,
      'Nota dibatalkan vendor',
      'request-reversal-1',
    );
    expect(await cashBalance(database, demoIds.organization)).toBe(500_000);
  });

  it('refuses to reverse a payment ledger entry without a payment-aware workflow', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const resident = await safeUserById(database, demoIds.resident);
    const treasurer = await safeUserById(database, demoIds.treasurer);
    if (!admin || !resident || !treasurer) throw new Error('Demo users missing');
    const bill = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran keamanan Agustus',
      description: 'Operasional keamanan lingkungan bulan Agustus.',
      period: '2026-08',
      dueAt: '2026-08-31T16:59:59.000Z',
      amount: 175_000,
      kind: 'MANDATORY',
      recurrence: 'MONTHLY',
    });
    const payment = await createPayment(database, resident, bill.id, {
      amount: 175_000,
      method: 'BANK_TRANSFER',
      idempotencyKey: 'payment-reversal-guard',
    });
    await verifyPayment(database, treasurer, payment.id, 'request-verify-reversal');
    const ledger = await database.query<{ id: string }>(
      'SELECT id FROM finance_transactions WHERE payment_id = $1',
      [payment.id],
    );
    const balanceBefore = await cashBalance(database, demoIds.organization);

    await expect(
      reverseFinanceTransaction(
        database,
        treasurer,
        ledger.rows[0]!.id,
        'Pembayaran perlu dikoreksi',
        'request-invalid-payment-reversal',
      ),
    ).rejects.toMatchObject({
      code: 'PAYMENT_REVERSAL_REQUIRES_WORKFLOW',
      statusCode: 409,
    });
    const state = await database.query<{ bill_status: string; payment_status: string }>(
      `SELECT b.status AS bill_status, p.status AS payment_status
       FROM bills b JOIN payments p ON p.bill_id = b.id
       WHERE b.id = $1 AND p.id = $2`,
      [bill.id, payment.id],
    );
    expect(state.rows[0]).toEqual({ bill_status: 'PAID', payment_status: 'PAID' });
    expect(await cashBalance(database, demoIds.organization)).toBe(balanceBefore);
  });

  it('never verifies payments beyond the outstanding bill amount', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const resident = await safeUserById(database, demoIds.resident);
    const treasurer = await safeUserById(database, demoIds.treasurer);
    if (!admin || !resident || !treasurer) throw new Error('Demo users missing');
    const bill = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran dengan dua bukti',
      description: 'Tagihan untuk menguji batas alokasi pembayaran.',
      period: '2026-11',
      dueAt: '2026-11-30T16:59:59.000Z',
      amount: 150_000,
      kind: 'MANDATORY',
      recurrence: 'ONE_TIME',
    });
    const first = await createPayment(database, resident, bill.id, {
      amount: 150_000,
      method: 'BANK_TRANSFER',
      idempotencyKey: 'first-full-payment',
    });
    const duplicate = await createPayment(database, resident, bill.id, {
      amount: 150_000,
      method: 'BANK_TRANSFER',
      idempotencyKey: 'second-full-payment',
    });

    await verifyPayment(database, treasurer, first.id, 'verify-first-full-payment');
    await expect(
      verifyPayment(database, treasurer, duplicate.id, 'verify-second-full-payment'),
    ).rejects.toMatchObject({
      code: 'PAYMENT_EXCEEDS_OUTSTANDING',
      statusCode: 409,
    });
    const state = await database.query<{
      amount_paid: number | string;
      status: string;
      pending: number | string;
      ledger_count: number | string;
    }>(
      `SELECT b.amount_paid, b.status,
         (SELECT count(*) FROM payments p
          WHERE p.id = $2 AND p.status = 'PENDING_VERIFICATION') AS pending,
         (SELECT count(*) FROM finance_transactions ft
          WHERE ft.payment_id IN ($3, $2)) AS ledger_count
       FROM bills b WHERE b.id = $1`,
      [bill.id, duplicate.id, first.id],
    );
    expect(state.rows[0]).toMatchObject({
      amount_paid: 150_000,
      status: 'PAID',
      pending: 1,
      ledger_count: 1,
    });
  });

  it('makes payment submission idempotent per organization', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const resident = await safeUserById(database, demoIds.resident);
    if (!admin || !resident) throw new Error('Demo users missing');
    const bill = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran sampah Juli',
      description: 'Biaya pengangkutan sampah rumah tangga bulan Juli.',
      period: '2026-07',
      dueAt: '2026-07-31T16:59:59.000Z',
      amount: 50_000,
      kind: 'MANDATORY',
      recurrence: 'MONTHLY',
    });
    const input = {
      amount: 50_000,
      method: 'BANK_TRANSFER' as const,
      idempotencyKey: 'same-payment-request',
      note: 'Transfer dari rekening keluarga',
    };

    const first = await createPayment(database, resident, bill.id, input);
    const second = await createPayment(database, resident, bill.id, input);
    expect(second.id).toBe(first.id);
    await expect(
      createPayment(database, resident, bill.id, {
        ...input,
        note: 'Payload yang berbeda',
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', statusCode: 409 });
  });

  it('coalesces concurrent retries with the same idempotency key', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const resident = await safeUserById(database, demoIds.resident);
    if (!admin || !resident) throw new Error('Demo users missing');
    const bill = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran retry bersamaan',
      description: 'Pengujian dua pengiriman identik pada waktu bersamaan.',
      period: '2026-10',
      dueAt: '2026-10-31T16:59:59.000Z',
      amount: 35_000,
      kind: 'MANDATORY',
      recurrence: 'ONE_TIME',
    });
    const input = {
      amount: 35_000,
      method: 'BANK_TRANSFER' as const,
      idempotencyKey: 'concurrent-identical-payment',
      note: 'Retry identik',
    };

    const [first, second] = await Promise.all([
      createPayment(database, resident, bill.id, input),
      createPayment(database, resident, bill.id, input),
    ]);
    expect(second.id).toBe(first.id);
    const count = await database.query<{ count: number | string }>(
      'SELECT count(*) AS count FROM payments WHERE idempotency_key = $1',
      [input.idempotencyKey],
    );
    expect(Number(count.rows[0]?.count)).toBe(1);
  });

  it('does not disclose a payment when another household reuses its idempotency key', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    const residentA = await safeUserById(database, demoIds.resident);
    const residentB = await safeUserById(database, demoIds.residentTwo);
    if (!admin || !residentA || !residentB) throw new Error('Demo users missing');
    const billA = await createBill(database, admin, {
      householdId: demoIds.householdA,
      title: 'Iuran rumah A',
      description: 'Iuran lingkungan rumah A untuk bulan pengujian.',
      period: '2026-08',
      dueAt: '2026-08-31T16:59:59.000Z',
      amount: 50_000,
      kind: 'MANDATORY',
      recurrence: 'MONTHLY',
    });
    const billB = await createBill(database, admin, {
      householdId: demoIds.householdB,
      title: 'Iuran rumah B',
      description: 'Iuran lingkungan rumah B untuk bulan pengujian.',
      period: '2026-08',
      dueAt: '2026-08-31T16:59:59.000Z',
      amount: 50_000,
      kind: 'MANDATORY',
      recurrence: 'MONTHLY',
    });
    const key = 'cross-household-key';
    await createPayment(database, residentA, billA.id, {
      amount: 50_000,
      method: 'BANK_TRANSFER',
      idempotencyKey: key,
    });

    await expect(
      createPayment(database, residentB, billB.id, {
        amount: 50_000,
        method: 'BANK_TRANSFER',
        idempotencyKey: key,
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', statusCode: 409 });
  });
});
