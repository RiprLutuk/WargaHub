import type { Database } from '../db/client.js';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

type WorkerOptions = {
  now?: Date;
  workerId?: string;
  sendEmail?: (payload: EmailPayload) => Promise<void>;
};

export type WorkerResult = {
  scheduledAnnouncements: number;
  cleanedSessions: number;
  completedJobs: number;
  failedJobs: number;
};

export async function runWorkerCycle(
  database: Database,
  options: WorkerOptions = {},
): Promise<WorkerResult> {
  const now = (options.now ?? new Date()).toISOString();
  const published = await database.query<{
    id: string;
    organization_id: string;
    title: string;
    summary: string;
  }>(
    `UPDATE announcements
     SET status = 'PUBLISHED', published_at = COALESCE(published_at, $1),
       updated_at = $1
     WHERE status = 'SCHEDULED' AND publish_at <= $1
     RETURNING id, organization_id, title, summary`,
    [now],
  );
  for (const announcement of published.rows) {
    await database.query(
      `INSERT INTO notifications
        (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
       SELECT 'notif_' || u.id || '_' || $1, $2, u.id, 'ANNOUNCEMENT', $3, $4,
         '/app/pengumuman/' || $1, 'announcement:' || $1
       FROM users u WHERE u.organization_id = $2 AND u.status = 'ACTIVE'
       ON CONFLICT (organization_id, user_id, deduplication_key) DO NOTHING`,
      [announcement.id, announcement.organization_id, announcement.title, announcement.summary],
    );
  }

  const cleaned = await database.query(
    `DELETE FROM sessions WHERE expires_at <= $1 OR (revoked_at IS NOT NULL AND revoked_at <= $1)`,
    [now],
  );

  let completedJobs = 0;
  let failedJobs = 0;
  if (options.sendEmail) {
    const jobs = await database.query<{
      id: string;
      payload: EmailPayload | string;
      attempts: number;
    }>(
      `UPDATE jobs SET status = 'RUNNING', locked_at = $1, locked_by = $2
       WHERE id IN (
         SELECT id FROM jobs
         WHERE kind = 'SEND_EMAIL' AND status IN ('PENDING', 'FAILED') AND run_at <= $1
         ORDER BY run_at LIMIT 20 FOR UPDATE SKIP LOCKED
       )
       RETURNING id, payload, attempts`,
      [now, options.workerId ?? 'wargahub-worker'],
    );
    for (const job of jobs.rows) {
      try {
        const payload =
          typeof job.payload === 'string'
            ? (JSON.parse(job.payload) as EmailPayload)
            : job.payload;
        await options.sendEmail(payload);
        await database.query(
          `UPDATE jobs SET status = 'COMPLETED', attempts = attempts + 1,
             locked_at = NULL, locked_by = NULL, last_error = NULL
           WHERE id = $1`,
          [job.id],
        );
        completedJobs += 1;
      } catch (error) {
        const attempts = job.attempts + 1;
        await database.query(
          `UPDATE jobs SET status = $1, attempts = $2, last_error = $3,
             locked_at = NULL, locked_by = NULL,
             run_at = $4
           WHERE id = $5`,
          [
            attempts >= 5 ? 'DEAD' : 'FAILED',
            attempts,
            error instanceof Error ? error.message.slice(0, 1000) : 'Unknown email error',
            new Date(new Date(now).getTime() + Math.min(attempts * 300_000, 3_600_000)).toISOString(),
            job.id,
          ],
        );
        failedJobs += 1;
      }
    }
  }

  return {
    scheduledAnnouncements: published.rowCount,
    cleanedSessions: cleaned.rowCount,
    completedJobs,
    failedJobs,
  };
}
