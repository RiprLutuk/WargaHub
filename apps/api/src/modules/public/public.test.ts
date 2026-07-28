import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { safeUserById } from '../../lib/auth.js';
import { demoIds, seedDemoData } from '../../seed.js';
import { postFinanceTransaction } from '../finance/service.js';

describe('sanitized public transparency and agenda', () => {
  let database: Database | undefined;
  let app: FastifyInstance | undefined;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    const treasurer = await safeUserById(database, demoIds.treasurer);
    if (!treasurer) throw new Error('Treasurer missing');
    await postFinanceTransaction(database, treasurer, {
      kind: 'INCOME',
      category: 'Iuran',
      description: 'Rincian privat pemasukan rumah A-01',
      amount: 500_000,
      occurredAt: '2026-07-20T08:00:00.000Z',
    });
    await postFinanceTransaction(database, treasurer, {
      kind: 'EXPENSE',
      category: 'Kebersihan',
      description: 'Rincian privat transaksi vendor',
      amount: 125_000,
      occurredAt: '2026-07-21T08:00:00.000Z',
    });
    await database.query(
      `INSERT INTO activities
        (id, organization_id, coordinator_id, title, description, location,
         starts_at, ends_at, status)
       VALUES ('public_test_activity', $1, $2, 'Kerja bakti taman',
         'Kegiatan taman dengan pilihan kontribusi.', 'Taman RW',
         '2026-08-02T00:00:00.000Z', '2026-08-02T03:00:00.000Z', 'PUBLISHED')
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [demoIds.organization, demoIds.coordinator],
    );
    app = await buildApp({ database, logger: false });
  }, 30000);

  afterEach(async () => {
    await app?.close();
    await database?.close();
  });

  it('shows only aggregate public finance values', async () => {
    const response = await app!.inject({ method: 'GET', url: '/api/v1/public/transparency' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      currency: 'IDR',
      income: 500_000,
      expense: 125_000,
      balance: 375_000,
    });
    expect(response.json().data.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'INCOME', category: 'Iuran', amount: 500_000 }),
      expect.objectContaining({ kind: 'EXPENSE', category: 'Kebersihan', amount: 125_000 }),
    ]));
    expect(response.json().data.monthly).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: '2026-07', income: 500_000, expense: 125_000 }),
    ]));
    expect(response.body).not.toContain('rumah A-01');
  });

  it('exposes a minimal public agenda projection', async () => {
    const response = await app!.inject({ method: 'GET', url: '/api/v1/public/agenda' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      title: 'Kerja bakti taman',
      location: 'Taman RW',
    });
    expect(response.body).not.toContain('coordinatorId');
  });

  it('does not let private complaints suppress the public demo projection', async () => {
    const response = await app!.inject({ method: 'GET', url: '/api/v1/public/complaints' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBeGreaterThanOrEqual(2);
    expect(response.body).not.toContain('Lampu jalan dekat Blok A padam');
  });
});
