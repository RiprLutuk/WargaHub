import { ulid } from 'ulidx';
import type { Database } from '../../db/client.js';

const blockedKeys = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'tokenDigest',
  'token_digest',
  'csrfToken',
  'csrf_token',
  'proof',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      blockedKeys.has(key) ? '[REDACTED]' : redact(nested),
    ]),
  );
}

export async function recordAudit(
  database: Database,
  entry: {
    organizationId?: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await database.query(
    `INSERT INTO audit_logs
      (id, organization_id, actor_id, action, entity_type, entity_id, request_id,
       ip_address, user_agent, before_value, after_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
    [
      ulid(),
      entry.organizationId ?? null,
      entry.actorId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.requestId,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      entry.before === undefined ? null : JSON.stringify(redact(entry.before)),
      entry.after === undefined ? null : JSON.stringify(redact(entry.after)),
    ],
  );
}
