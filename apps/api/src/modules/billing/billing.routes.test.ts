import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { safeUserById } from '../../lib/auth.js';
import { demoIds, seedDemoData } from '../../seed.js';
import { createBill } from './service.js';

type AuthHeaders = { cookie: string; 'x-csrf-token': string };

describe('billing and finance HTTP API', () => {
  let database: Database;
  let app: FastifyInstance;

  async function login(email: string): Promise<AuthHeaders> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WargaHub123!' },
    });
    const setCookie = response.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
    if (!cookie) throw new Error('Login cookie missing');
    return { cookie, 'x-csrf-token': response.json().data.csrfToken as string };
  }

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    app = await buildApp({ database, logger: false });
  });

  afterEach(async () => {
    await app.close();
    await database.close();
  });

  it('prevents a resident from creating bills', async () => {
    const headers = await login('warga@demo.wargahub.id');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/bills',
      headers,
      payload: {
        householdId: demoIds.householdA,
        title: 'Iuran lingkungan Juli',
        description: 'Operasional keamanan dan kebersihan bulan Juli.',
        period: '2026-07',
        dueAt: '2026-07-31T16:59:59.000Z',
        amount: 150_000,
        kind: 'MANDATORY',
        recurrence: 'MONTHLY',
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('completes resident submission and treasurer verification', async () => {
    const admin = await safeUserById(database, demoIds.admin);
    if (!admin) throw new Error('Admin missing');
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
    const resident = await login('warga@demo.wargahub.id');
    const submitted = await app.inject({
      method: 'POST',
      url: `/api/v1/bills/${bill.id}/payments`,
      headers: { ...resident, 'idempotency-key': 'route-payment-july-a' },
      payload: { amount: 150_000, method: 'BANK_TRANSFER' },
    });
    expect(submitted.statusCode).toBe(201);

    const treasurer = await login('bendahara@demo.wargahub.id');
    const verified = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/${submitted.json().data.id}/verify`,
      headers: treasurer,
    });
    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/${submitted.json().data.id}/verify`,
      headers: treasurer,
    });

    expect(verified.statusCode).toBe(200);
    expect(verified.json().data.status).toBe('PAID');
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('PAYMENT_ALREADY_VERIFIED');
  });
});
