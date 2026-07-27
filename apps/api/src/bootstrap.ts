import { pathToFileURL } from 'node:url';
import { permissions, roleSchema, type Role } from '@wargahub/contracts';
import { ulid } from 'ulidx';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { hashPassword } from './lib/auth.js';
import { AppError } from './lib/http.js';
import { rolePermissions } from './lib/policy.js';
import { recordAudit } from './modules/audit/service.js';

const bootstrapInputSchema = z.object({
  organizationName: z.string().trim().min(3).max(120),
  shortName: z.string().trim().min(2).max(30),
  slug: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(1_000),
  address: z.string().trim().min(5).max(300),
  emergencyPhone: z.string().trim().min(3).max(30),
  rwCode: z.string().trim().min(1).max(5),
  rtCode: z.string().trim().min(1).max(5),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().toLowerCase().email().max(254),
  adminPassword: z.string().min(12).max(128)
    .regex(/[a-z]/, 'Kata sandi admin perlu huruf kecil.')
    .regex(/[A-Z]/, 'Kata sandi admin perlu huruf besar.')
    .regex(/\d/, 'Kata sandi admin perlu angka.'),
});

export type BootstrapInput = z.infer<typeof bootstrapInputSchema>;

export async function bootstrapInstallation(
  database: Database,
  rawInput: BootstrapInput,
): Promise<{ organizationId: string; adminId: string; adminEmail: string }> {
  const input = bootstrapInputSchema.parse(rawInput);
  const passwordHash = await hashPassword(input.adminPassword);

  return database.transaction(async (transaction) => {
    const existing = await transaction.query<{ id: string }>(
      'SELECT id FROM organizations LIMIT 1',
    );
    if (existing.rows[0]) {
      throw new AppError(
        409,
        'INSTALLATION_ALREADY_INITIALIZED',
        'Instalasi sudah memiliki organisasi. Bootstrap tidak dijalankan ulang.',
      );
    }

    const organizationId = `org_${ulid()}`;
    const rwId = `rw_${ulid()}`;
    const rtId = `rt_${ulid()}`;
    const adminId = `usr_${ulid()}`;

    await transaction.query(
      `INSERT INTO organizations
        (id, name, short_name, slug, description, address, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        organizationId,
        input.organizationName,
        input.shortName,
        input.slug,
        input.description,
        input.address,
        input.emergencyPhone,
      ],
    );
    await transaction.query(
      'INSERT INTO rws (id, organization_id, code, name) VALUES ($1, $2, $3, $4)',
      [rwId, organizationId, input.rwCode, `RW ${input.rwCode}`],
    );
    await transaction.query(
      `INSERT INTO rts (id, organization_id, rw_id, code, name)
       VALUES ($1, $2, $3, $4, $5)`,
      [rtId, organizationId, rwId, input.rtCode, `RT ${input.rtCode}`],
    );

    for (const permission of permissions) {
      await transaction.query(
        `INSERT INTO permissions (code, description) VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING`,
        [permission, permission.replaceAll('.', ' ')],
      );
    }

    let adminRoleId = '';
    for (const role of roleSchema.options as readonly Role[]) {
      const roleId = `role_${ulid()}`;
      await transaction.query(
        `INSERT INTO roles (id, organization_id, code, name)
         VALUES ($1, $2, $3, $4)`,
        [roleId, organizationId, role, role.replaceAll('_', ' ')],
      );
      for (const permission of rolePermissions[role]) {
        await transaction.query(
          `INSERT INTO role_permissions (role_id, permission_code)
           VALUES ($1, $2)`,
          [roleId, permission],
        );
      }
      if (role === 'ADMIN_ORGANIZATION') adminRoleId = roleId;
    }

    await transaction.query(
      `INSERT INTO users
        (id, organization_id, email, password_hash, name, status, privacy_consent_at)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP)`,
      [adminId, organizationId, input.adminEmail, passwordHash, input.adminName],
    );
    await transaction.query(
      `INSERT INTO user_roles
        (id, organization_id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, $4, 'ORGANIZATION', $2)`,
      [`user_role_${ulid()}`, organizationId, adminId, adminRoleId],
    );
    await transaction.query(
      `INSERT INTO cash_accounts (id, organization_id, name, kind)
       VALUES ($1, $2, 'Kas Utama', 'CASH')`,
      [`cash_${ulid()}`, organizationId],
    );
    await recordAudit(transaction, {
      organizationId,
      actorId: adminId,
      action: 'installation.bootstrap',
      entityType: 'organization',
      entityId: organizationId,
      requestId: 'bootstrap-cli',
      after: {
        adminEmail: input.adminEmail,
        rwCode: input.rwCode,
        rtCode: input.rtCode,
      },
    });

    return { organizationId, adminId, adminEmail: input.adminEmail };
  });
}

function bootstrapInputFromEnvironment(
  environment: Record<string, string | undefined>,
): BootstrapInput {
  return bootstrapInputSchema.parse({
    organizationName: environment.BOOTSTRAP_ORGANIZATION_NAME,
    shortName: environment.BOOTSTRAP_ORGANIZATION_SHORT_NAME,
    slug: environment.BOOTSTRAP_ORGANIZATION_SLUG,
    description: environment.BOOTSTRAP_ORGANIZATION_DESCRIPTION,
    address: environment.BOOTSTRAP_ORGANIZATION_ADDRESS,
    emergencyPhone: environment.BOOTSTRAP_EMERGENCY_PHONE,
    rwCode: environment.BOOTSTRAP_RW_CODE,
    rtCode: environment.BOOTSTRAP_RT_CODE,
    adminName: environment.BOOTSTRAP_ADMIN_NAME,
    adminEmail: environment.BOOTSTRAP_ADMIN_EMAIL,
    adminPassword: environment.BOOTSTRAP_ADMIN_PASSWORD,
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.NODE_ENV === 'production' && !config.DATABASE_URL) {
    throw new Error('DATABASE_URL wajib untuk bootstrap production.');
  }
  const database = await createDatabase({
    ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
    dataDir: config.PGLITE_DATA_DIR,
  });
  try {
    await runMigrations(database);
    const result = await bootstrapInstallation(
      database,
      bootstrapInputFromEnvironment(process.env),
    );
    process.stdout.write(
      `Instalasi siap. Organisasi ${result.organizationId}; admin ${result.adminEmail}.\n`,
    );
  } finally {
    await database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
