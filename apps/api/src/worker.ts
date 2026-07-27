import nodemailer from 'nodemailer';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { runWorkerCycle } from './jobs/worker.js';

const config = loadConfig();
if (config.NODE_ENV === 'production' && !config.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib untuk worker production.');
}
const database = await createDatabase({
  ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
  dataDir: config.PGLITE_DATA_DIR,
});
await runMigrations(database);

const transporter = config.SMTP_HOST
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      ...(config.SMTP_USER && config.SMTP_PASSWORD
        ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
        : {}),
    })
  : undefined;

let stopping = false;
async function cycle(): Promise<void> {
  const result = await runWorkerCycle(database, {
    workerId: `worker-${process.pid}`,
    ...(transporter
      ? {
          sendEmail: async (message: { to: string; subject: string; text: string }) => {
            await transporter.sendMail({ from: config.SMTP_FROM, ...message });
          },
        }
      : {}),
  });
  if (result.scheduledAnnouncements + result.completedJobs + result.failedJobs > 0) {
    process.stdout.write(`${JSON.stringify({ event: 'worker.cycle', ...result })}\n`);
  }
}

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await database.close();
}

await cycle();
const timer = setInterval(() => void cycle().catch((error) => console.error(error)), 15_000);
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
