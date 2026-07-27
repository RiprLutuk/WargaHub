import { createHash, randomBytes } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';
import type { Permission, Role, SafeUser } from '@wargahub/contracts';
import { ulid } from 'ulidx';
import type { AppConfig } from '../config.js';
import type { Database } from '../db/client.js';

type UserRow = {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  password_hash: string;
  status: 'INVITED' | 'ACTIVE' | 'INACTIVE';
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export async function findUserForLogin(
  database: Database,
  identifier: string,
): Promise<UserRow | undefined> {
  const result = await database.query<UserRow>(
    `SELECT id, organization_id, email, name, password_hash, status
     FROM users WHERE lower(email) = lower($1) OR phone = $1 LIMIT 1`,
    [identifier],
  );
  return result.rows[0];
}

export async function safeUserById(
  database: Database,
  userId: string,
): Promise<SafeUser | undefined> {
  const users = await database.query<{
    id: string;
    organization_id: string;
    email: string;
    name: string;
  }>(
    `SELECT id, organization_id, email, name
     FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [userId],
  );
  const user = users.rows[0];
  if (!user) return undefined;

  const [households, assigned] = await Promise.all([
    database.query<{ household_id: string }>(
      `SELECT household_id FROM household_members
       WHERE organization_id = $1 AND user_id = $2 AND ended_at IS NULL`,
      [user.organization_id, user.id],
    ),
    database.query<{ role_code: Role; permission_code: Permission | null }>(
      `SELECT r.code AS role_code, rp.permission_code
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
         AND ur.scope_type = 'ORGANIZATION'
         AND (ur.scope_id IS NULL OR ur.scope_id = ur.organization_id)
       WHERE ur.organization_id = $1 AND ur.user_id = $2`,
      [user.organization_id, user.id],
    ),
  ]);

  return {
    id: user.id,
    organizationId: user.organization_id,
    householdIds: households.rows.map((row) => row.household_id),
    email: user.email,
    name: user.name,
    roles: [...new Set(assigned.rows.map((row) => row.role_code))],
    permissions: [
      ...new Set(
        assigned.rows.flatMap((row) =>
          row.permission_code ? [row.permission_code] : [],
        ),
      ),
    ],
  };
}

export async function createSession(
  database: Database,
  config: AppConfig,
  user: Pick<UserRow, 'id' | 'organization_id'>,
  context: { ip?: string; userAgent?: string },
): Promise<{ id: string; token: string; csrfToken: string; expiresAt: Date }> {
  const id = ulid();
  const token = randomToken();
  const csrfToken = randomToken(24);
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3_600_000);
  await database.query(
    `INSERT INTO sessions
      (id, organization_id, user_id, token_digest, csrf_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      user.organization_id,
      user.id,
      digestToken(token),
      csrfToken,
      context.ip ?? null,
      context.userAgent ?? null,
      expiresAt.toISOString(),
    ],
  );
  return { id, token, csrfToken, expiresAt };
}
