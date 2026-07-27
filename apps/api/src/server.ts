import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';

const config = loadConfig();
if (config.NODE_ENV === 'production' && !config.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib di production; PGlite hanya untuk development/pilot lokal.');
}
const database = await createDatabase({
  ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
  dataDir: config.PGLITE_DATA_DIR,
});
await runMigrations(database);
const app = await buildApp({ database, config });

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'graceful shutdown started');
  await app.close();
  await database.close();
  process.exitCode = 0;
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  await database.close();
  process.exitCode = 1;
}
