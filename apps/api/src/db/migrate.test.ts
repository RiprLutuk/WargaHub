import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './client.js';
import { runMigrations } from './migrate.js';

describe('database migrations', () => {
  let database: Database | undefined;

  afterEach(async () => {
    await database?.close();
  });

  it('creates the core tables and is idempotent', async () => {
    database = await createDatabase({ dataDir: 'memory://' });

    const first = await runMigrations(database);
    const second = await runMigrations(database);
    const tables = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );

    expect(first).toEqual([
      '0001_initial.sql',
      '0002_workflow_details.sql',
      '0003_invitation_tokens.sql',
      '0004_file_purpose_guards.sql',
      '0005_patrol_swap_guards.sql',
      '0006_governance_and_extended_modules.sql',
      '0007_organization_structure.sql',
    ]);
    expect(second).toEqual([]);
    expect(tables.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'organizations',
        'households',
        'users',
        'bills',
        'payments',
        'finance_transactions',
        'complaints',
        'activities',
      ]),
    );
  });
});
