import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { safeUserById } from '../../lib/auth.js';
import { demoIds, seedDemoData } from '../../seed.js';
import { createBill } from '../billing/service.js';

describe('role-aware dashboards and audit access', () => {
  let database: Database;
  let app: FastifyInstance;

  async function login(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WargaHub123!' },
    });
    const setCookie = response.headers['set-cookie'];
    return {
      cookie: (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0] ?? '',
      csrf: response.json().data.csrfToken as string,
    };
  }

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    const admin = await safeUserById(database, demoIds.admin);
    if (!admin) throw new Error('Admin missing');
    const base = {
      title: 'Iuran lingkungan Juli',
      description: 'Operasional keamanan dan kebersihan bulan Juli.',
      period: '2026-07',
      dueAt: '2026-07-31T16:59:59.000Z',
      kind: 'MANDATORY' as const,
      recurrence: 'MONTHLY' as const,
    };
    await createBill(database, admin, {
      ...base,
      householdId: demoIds.householdA,
      amount: 150_000,
    });
    await createBill(database, admin, {
      ...base,
      householdId: demoIds.householdB,
      amount: 900_000,
    });
    app = await buildApp({ database, logger: false });
  });

  afterEach(async () => {
    await app.close();
    await database.close();
  });

  it('shows a resident only obligations for linked households', async () => {
    const resident = await login('warga@demo.wargahub.id');
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { cookie: resident.cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.obligations).toHaveLength(1);
    expect(response.json().data.obligations[0].amount).toBe(150_000);
    expect(response.body).not.toContain('900000');
  });

  it('allows audit access only to authorized roles', async () => {
    const resident = await login('warga@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-logs',
      headers: { cookie: resident.cookie },
    });
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-logs',
      headers: { cookie: admin.cookie },
    });
    expect(denied.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().data.some((entry: { action: string }) => entry.action === 'auth.login')).toBe(
      true,
    );
  });

  it('lets an admin configure MVP modules while a resident cannot', async () => {
    const admin = await login('admin@demo.wargahub.id');
    const resident = await login('warga@demo.wargahub.id');
    const modules = {
      billing: true,
      finance: true,
      patrol: true,
      complaints: false,
      activities: true,
      documents: true,
    };
    const updated = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/modules',
      headers: { cookie: admin.cookie, 'x-csrf-token': admin.csrf },
      payload: modules,
    });
    const denied = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/modules',
      headers: { cookie: resident.cookie, 'x-csrf-token': resident.csrf },
      payload: modules,
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.complaints).toBe(false);
    expect(denied.statusCode).toBe(403);
  });
});
