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
      bulkAnnouncements: number | string;
      bulkComplaints: number | string;
      bulkActivities: number | string;
      bulkDocuments: number | string;
      bulkFacilities: number | string;
      bulkPrograms: number | string;
      bulkUmkms: number | string;
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
        (SELECT COUNT(*) FROM documents) AS documents,
        (SELECT COUNT(*) FROM announcements WHERE id LIKE 'announcement_demo_bulk_%') AS "bulkAnnouncements",
        (SELECT COUNT(*) FROM complaints WHERE id LIKE 'complaint_demo_bulk_%') AS "bulkComplaints",
        (SELECT COUNT(*) FROM activities WHERE id LIKE 'activity_demo_bulk_%') AS "bulkActivities",
        (SELECT COUNT(*) FROM documents WHERE id LIKE 'document_demo_bulk_%') AS "bulkDocuments",
        (SELECT COUNT(*) FROM facilities WHERE id LIKE 'facility_demo_bulk_%') AS "bulkFacilities",
        (SELECT COUNT(*) FROM programs WHERE id LIKE 'program_demo_bulk_%') AS "bulkPrograms",
        (SELECT COUNT(*) FROM umkms WHERE id LIKE 'umkm_demo_bulk_%') AS "bulkUmkms"`,
    );
    const count = counts.rows[0];
    expect(count).toBeDefined();
    expect(count).toMatchObject({
      organizations: 1,
      announcements: 27,
      complaints: 25,
      activities: 19,
      patrols: 2,
      documents: 22,
    });
    expect(Number(count?.bills)).toBeGreaterThanOrEqual(122);
    expect(Number(count?.bulkResidents)).toBe(100);
    expect(Number(count?.financeTransactions)).toBe(240);
    expect(Number(count?.bulkAnnouncements)).toBe(24);
    expect(Number(count?.bulkComplaints)).toBe(24);
    expect(Number(count?.bulkActivities)).toBe(18);
    expect(Number(count?.bulkDocuments)).toBe(20);
    expect(Number(count?.bulkFacilities)).toBe(12);
    expect(Number(count?.bulkPrograms)).toBe(12);
    expect(Number(count?.bulkUmkms)).toBe(24);
  });
});
