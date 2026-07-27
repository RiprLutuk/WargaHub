import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { seedDemoData } from '../../seed.js';

describe('Extended Modules API', () => {
  let database: Database;
  let app: FastifyInstance;

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

  it('manages facilities and reservations', async () => {
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const adminCookie = adminLogin.headers['set-cookie'] as string;
    const adminCsrf = adminLogin.json().data.csrfToken;

    // Create facility
    const facRes = await app.inject({
      method: 'POST',
      url: '/api/v1/facilities',
      headers: {
        cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      payload: {
        name: 'Balai Warga Serbaguna RT 01',
        description: 'Fasilitas pertemuan warga dan acara syukuran',
        category: 'HALL',
        fee: 50000,
        deposit: 100000,
        requiresApproval: true,
      },
    });

    expect(facRes.statusCode).toBe(201);
    expect(facRes.json().data.name).toBe('Balai Warga Serbaguna RT 01');

    // List facilities
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/facilities',
      headers: { cookie: adminCookie },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data.length).toBeGreaterThan(0);
  });

  it('registers resident vehicles and guest pre-registrations', async () => {
    const residentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'warga@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const residentCookie = residentLogin.headers['set-cookie'] as string;
    const residentCsrf = residentLogin.json().data.csrfToken;

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: residentCookie },
    });
    const householdId = meRes.json().data.user.householdIds[0];

    // Vehicle
    const vehRes = await app.inject({
      method: 'POST',
      url: '/api/v1/vehicles',
      headers: {
        cookie: residentCookie,
        'x-csrf-token': residentCsrf,
      },
      payload: {
        householdId,
        plateNumber: 'B 1234 WGH',
        type: 'CAR',
        brandModel: 'Toyota Innova Zenix',
      },
    });
    expect(vehRes.statusCode).toBe(201);
    expect(vehRes.json().data.plateNumber).toBe('B 1234 WGH');

    // Guest
    const gstRes = await app.inject({
      method: 'POST',
      url: '/api/v1/guests',
      headers: {
        cookie: residentCookie,
        'x-csrf-token': residentCsrf,
      },
      payload: {
        householdId,
        guestName: 'Pak Hendra (Teknisi Internet)',
        phone: '081299998888',
        purpose: 'Perbaikan jaringan FO rumah A-01',
        expectedArrival: new Date(Date.now() + 3600000).toISOString(),
      },
    });
    expect(gstRes.statusCode).toBe(201);
    expect(gstRes.json().data.passCode).toBeDefined();
  });

  it('manages UMKM directory and Lost & Found items', async () => {
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@demo.wargahub.id', password: 'WargaHub123!' },
    });
    const adminCookie = adminLogin.headers['set-cookie'] as string;
    const adminCsrf = adminLogin.json().data.csrfToken;

    // UMKM
    const umkmRes = await app.inject({
      method: 'POST',
      url: '/api/v1/umkms',
      headers: {
        cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      payload: {
        name: 'Dapur Bu Yanti',
        category: 'KULINER',
        description: 'Nasi Kuning dan Aneka Kue Basah Pesanan Warga',
        contactPhone: '081377776666',
        operatingHours: '06:00 - 14:00 WIB',
      },
    });
    expect(umkmRes.statusCode).toBe(201);

    // Lost & Found
    const lfRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lost-found',
      headers: {
        cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      payload: {
        kind: 'LOST',
        title: 'Kunci Motor Honda Vario Hitam',
        description: 'Tergantung gantungan kunci berbentuk dompet kecil cokelat',
        location: 'Taman Pos Ronda Blok A',
      },
    });
    expect(lfRes.statusCode).toBe(201);
  });
});
