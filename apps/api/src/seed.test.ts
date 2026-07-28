import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { seedDemoData, seedExpandedDemoData } from './seed.js';

describe('demo seed', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
  });

  afterEach(async () => database.close());

  it('creates meaningful sample workflows and remains idempotent', async () => {
    await seedDemoData(database);
    await seedDemoData(database);
    await seedExpandedDemoData(database);
    await seedExpandedDemoData(database);

    const counts = await database.query<{
      organizations: number | string;
      announcements: number | string;
      bills: number | string;
      bulkResidents: number | string;
      financeTransactions: number | string;
      complaints: number | string;
      activities: number | string;
      patrols: number | string;
      documents: number | string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM organizations) AS organizations,
        (SELECT COUNT(*) FROM announcements) AS announcements,
        (SELECT COUNT(*) FROM bills) AS bills,
        (SELECT COUNT(*) FROM users WHERE id LIKE 'user_demo_resident_bulk_%') AS "bulkResidents",
        (SELECT COUNT(*) FROM finance_transactions WHERE id LIKE 'finance_demo_bulk_%') AS "financeTransactions",
        (SELECT COUNT(*) FROM complaints) AS complaints,
        (SELECT COUNT(*) FROM activities) AS activities,
        (SELECT COUNT(*) FROM patrol_assignments) AS patrols,
        (SELECT COUNT(*) FROM documents) AS documents`,
    );
    const count = counts.rows[0];
    expect(count).toBeDefined();
    expect(count).toMatchObject({
      organizations: 1,
      announcements: 3,
      complaints: 1,
      activities: 1,
      patrols: 2,
      documents: 2,
    });
    expect(Number(count?.bills)).toBeGreaterThanOrEqual(122);
    expect(Number(count?.bulkResidents)).toBe(100);
    expect(Number(count?.financeTransactions)).toBe(240);
  });
});
