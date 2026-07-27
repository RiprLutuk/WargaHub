import { createDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const database = await createDatabase({ dataDir: 'memory://' });
try {
  const first = await runMigrations(database);
  const second = await runMigrations(database);
  process.stdout.write(`${first.join(', ')} applied\n`);
  process.stdout.write(second.length === 0 ? 'database up to date\n' : `${second.join(', ')} applied\n`);
} finally {
  await database.close();
}
