import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { hasPermission } from './lib/policy.js';
import { seedDemoData } from './seed.js';

describe('authentication and policy', () => {
  let database: Database;
  let app: FastifyInstance;

  beforeAll(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, {
      includeInactiveUser: true,
      includeSampleContent: false,
    });
    app = await buildApp({ database, logger: false });
  }, 30000);

  afterAll(async () => {
    await app?.close();
    await database?.close();
  });

  it('logs in an active user without exposing the password hash', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'warga@demo.wargahub.id',
        password: 'WargaHub123!',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.email).toBe('warga@demo.wargahub.id');
    expect(response.body).not.toContain('password_hash');
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
    expect(cookies).toContain('wargahub_session=');
    expect(cookies).toContain('wargahub_csrf=');
    expect(cookies).toContain('HttpOnly');
  });

  it('blocks inactive accounts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'inactive@demo.wargahub.id',
        password: 'WargaHub123!',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('supports phone login without requiring an OTP provider', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { phone: '+6281234567890', password: 'WargaHub123!' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.email).toBe('warga@demo.wargahub.id');
  });

  it('grants permissions only when explicitly assigned', () => {
    expect(hasPermission(['billing.read'], 'billing.read')).toBe(true);
    expect(hasPermission(['billing.read'], 'billing.create')).toBe(false);
  });

  it('does not promote a geographically scoped role to organization permissions', async () => {
    const role = await database.query<{ id: string }>(
      `SELECT id FROM roles
       WHERE organization_id = $1 AND code = 'ADMIN_ORGANIZATION'`,
      ['org_demo_wargahub'],
    );
    await database.query(
      `INSERT INTO user_roles
        (id, organization_id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, $4, 'RT', $5)`,
      [
        'user_role_resident_scoped_admin',
        'org_demo_wargahub',
        'user_demo_resident',
        role.rows[0]!.id,
        'rt_demo_03',
      ],
    );

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'warga@demo.wargahub.id',
        password: 'WargaHub123!',
      },
    });

    expect(login.statusCode).toBe(200);
    expect(login.json().data.user.roles).toContain('ADMIN_ORGANIZATION');
    expect(login.json().data.user.permissions).not.toContain('resident.read');
    expect(login.json().data.user.permissions).not.toContain('settings.manage');
  });

  it('returns a safe profile without exposing session metadata', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'warga@demo.wargahub.id',
        password: 'WargaHub123!',
      },
    });
    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .filter(Boolean)
      .map((value) => value?.split(';')[0])
      .join('; ');
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.email).toBe('warga@demo.wargahub.id');
    expect(response.json().data.user).not.toHaveProperty('sessionId');
    expect(response.json().data.user).not.toHaveProperty('csrfToken');
  });

  it('revokes the current session on logout', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'warga@demo.wargahub.id',
        password: 'WargaHub123!',
      },
    });
    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
    const csrf = login.json().data.csrfToken as string;

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie, 'x-csrf-token': csrf },
    });
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie },
    });

    expect(logout.statusCode).toBe(200);
    expect(me.statusCode).toBe(401);
  });

  it('resets a password with a short-lived one-time token', async () => {
    const requested = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'warga@demo.wargahub.id' },
    });
    expect(requested.statusCode).toBe(202);
    expect(requested.body).not.toContain('resetToken');

    const jobs = await database.query<{ payload: string | { text: string } }>(
      `SELECT payload FROM jobs WHERE kind = 'SEND_EMAIL' ORDER BY created_at DESC LIMIT 1`,
    );
    const payload =
      typeof jobs.rows[0]?.payload === 'string'
        ? (JSON.parse(jobs.rows[0].payload) as { text: string })
        : jobs.rows[0]?.payload;
    expect(payload?.text).toContain('/reset-password#token=');
    expect(payload?.text).not.toContain('/reset-password?token=');
    const token = payload?.text.match(/token=([^\s]+)/)?.[1];
    if (!token) throw new Error('Reset token was not queued');

    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token, password: 'WargaHubBaru456!' },
    });
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'warga@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'warga@demo.wargahub.id', password: 'WargaHubBaru456!' },
    });

    expect(reset.statusCode).toBe(200);
    expect(oldLogin.statusCode).toBe(401);
    expect(newLogin.statusCode).toBe(200);
  });
});
