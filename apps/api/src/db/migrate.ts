import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.js';
import { createDatabase, type Database } from './client.js';

const defaultMigrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

export async function runMigrations(
  database: Database,
  migrationsDirectory = defaultMigrationsDirectory,
): Promise<string[]> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const entries = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  const applied = await database.query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  const appliedNames = new Set(applied.rows.map((row) => row.name));
  const completed: string[] = [];

  for (const name of entries) {
    if (appliedNames.has(name)) continue;
    const sql = await readFile(join(migrationsDirectory, name), 'utf8');
    await database.transaction(async (transaction) => {
      await transaction.query(sql);
      await transaction.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [name],
      );
    });
    completed.push(name);
  }

  return completed;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const database = await createDatabase({
    ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
    dataDir: config.PGLITE_DATA_DIR,
  });
  try {
    const applied = await runMigrations(database);
    process.stdout.write(
      applied.length > 0
        ? `${applied.join(', ')} applied\n`
        : 'database up to date\n',
    );
  } finally {
    await database.close();
  }
}

if (import.meta.main) {
  await main();
}
