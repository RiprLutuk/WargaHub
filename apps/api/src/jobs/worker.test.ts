import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { demoIds, seedDemoData } from '../seed.js';
import { runWorkerCycle } from './worker.js';

describe('background worker cycle', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
  });

  afterEach(async () => {
    await database.close();
  });

  it('publishes due announcements and cleans expired sessions', async () => {
    await database.query(
      `INSERT INTO announcements
        (id, organization_id, author_id, category, title, slug, summary, content,
         visibility, status, publish_at)
       VALUES ('announcement_due', $1, $2, 'UMUM', 'Informasi terjadwal',
         'informasi-terjadwal', 'Informasi akan segera diterbitkan.',
         'Isi informasi resmi yang telah dijadwalkan pengurus.', 'PUBLIC',
         'SCHEDULED', '2026-07-20T00:00:00.000Z')`,
      [demoIds.organization, demoIds.admin],
    );
    await database.query(
      `INSERT INTO sessions
        (id, organization_id, user_id, token_digest, csrf_token, expires_at)
       VALUES ('session_expired', $1, $2, 'expired-digest', 'expired-csrf',
         '2026-07-20T00:00:00.000Z')`,
      [demoIds.organization, demoIds.resident],
    );

    const result = await runWorkerCycle(database, {
      now: new Date('2026-07-27T00:00:00.000Z'),
    });
    const announcement = await database.query<{ status: string }>(
      `SELECT status FROM announcements WHERE id = 'announcement_due'`,
    );
    const session = await database.query<{ id: string }>(
      `SELECT id FROM sessions WHERE id = 'session_expired'`,
    );

    expect(result).toMatchObject({ scheduledAnnouncements: 1, cleanedSessions: 1 });
    expect(announcement.rows[0]?.status).toBe('PUBLISHED');
    expect(session.rows).toHaveLength(0);
  });
});
