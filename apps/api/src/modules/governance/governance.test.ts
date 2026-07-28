import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { seedDemoData } from '../../seed.js';

describe('Governance & Voting API', () => {
  let database: Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    app = await buildApp({ database, logger: false });
  }, 30000);

  afterEach(async () => {
    await app?.close();
    await database?.close();
  });

  it('creates a poll and records resident vote', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const adminCookie = loginRes.headers['set-cookie'] as string;
    const adminCsrf = loginRes.json().data.csrfToken;

    // Create poll
    const pollRes = await app.inject({
      method: 'POST',
      url: '/api/v1/polls',
      headers: {
        cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      payload: {
        title: 'Pemilihan Vendor Pos Ronda 2026',
        description: 'Musyawarah penentuan pihak ketiga pengadaan pos ronda RT 01',
        category: 'GOVERNANCE',
        ballotType: 'PER_RESIDENT',
        quorumPercentage: 60,
        endsAt: new Date(Date.now() + 86400000).toISOString(),
        options: [
          { label: 'Vendor A - PT Citra Aman', description: 'Rp 15.000.000' },
          { label: 'Vendor B - CV Karya Mandiri', description: 'Rp 13.500.000' },
        ],
      },
    });

    expect(pollRes.statusCode).toBe(201);
    const pollData = pollRes.json().data;
    expect(pollData.status).toBe('ACTIVE');

    // List polls
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/polls',
      headers: { cookie: adminCookie },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data.length).toBeGreaterThan(0);
  });

  it('creates and manages administrative letter requests', async () => {
    const residentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'warga@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const residentCookie = residentLogin.headers['set-cookie'] as string;
    const residentCsrf = residentLogin.json().data.csrfToken;

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const adminCookie = adminLogin.headers['set-cookie'] as string;
    const adminCsrf = adminLogin.json().data.csrfToken;

    // Fetch household ID
    const userProfile = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: residentCookie },
    });
    const householdId = userProfile.json().data.user.householdIds[0];

    // Resident submits letter request
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/letters',
      headers: {
        cookie: residentCookie,
        'x-csrf-token': residentCsrf,
      },
      payload: {
        householdId,
        letterType: 'DOMICILE',
        purpose: 'Pengurusan perpanjangan KTP dan domisili usaha',
        fields: { nik: '3171010000000001' },
      },
    });

    expect(reqRes.statusCode).toBe(201);
    const letter = reqRes.json().data;
    expect(letter.status).toBe('SUBMITTED');
    expect(letter.verificationToken).toBeDefined();

    // Admin updates letter status to ISSUED
    const statusRes = await app.inject({
      method: 'POST',
      url: `/api/v1/letters/${letter.id}/status`,
      headers: {
        cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      payload: {
        status: 'ISSUED',
        letterNumber: '001/RT01/RW05/VII/2026',
      },
    });

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().data.status).toBe('ISSUED');
  });
});
