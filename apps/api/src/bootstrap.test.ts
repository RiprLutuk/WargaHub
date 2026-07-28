import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapInstallation } from './bootstrap.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { safeUserById, verifyPassword } from './lib/auth.js';

describe('production installation bootstrap', () => {
  let database: Database | undefined;

  afterEach(async () => {
    await database?.close();
  });

  it('creates one organization, its initial area, and a fully authorized admin', async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);

    const result = await bootstrapInstallation(database, {
      organizationName: 'Warga Sejahtera',
      shortName: 'RW Sejahtera',
      slug: 'warga-sejahtera',
      description: 'Lingkungan bersama yang transparan dan saling menjaga.',
      address: 'Kelurahan Sukamaju, Indonesia',
      emergencyPhone: '112',
      rwCode: '07',
      rtCode: '02',
      adminName: 'Admin Utama',
      adminEmail: 'admin@wargasejahtera.id',
      adminPassword: 'RahasiaAman123!',
    });

    const user = await safeUserById(database, result.adminId);
    const stored = await database.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [result.adminId],
    );
    const areas = await database.query<{ rw_code: string; rt_code: string }>(
      `SELECT rw.code AS rw_code, rt.code AS rt_code
       FROM rws rw JOIN rts rt ON rt.rw_id = rw.id
       WHERE rw.organization_id = $1`,
      [result.organizationId],
    );

    expect(user?.email).toBe('admin@wargasejahtera.id');
    expect(user?.roles).toContain('ADMIN_ORGANIZATION');
    expect(user?.permissions).toContain('settings.manage');
    expect(await verifyPassword(stored.rows[0]!.password_hash, 'RahasiaAman123!')).toBe(true);
    expect(areas.rows).toEqual([{ rw_code: '07', rt_code: '02' }]);
  }, 30000);

  it('refuses to initialize a database that already has an organization', async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    const input = {
      organizationName: 'Warga Sejahtera',
      shortName: 'RW Sejahtera',
      slug: 'warga-sejahtera',
      description: 'Lingkungan bersama yang transparan dan saling menjaga.',
      address: 'Kelurahan Sukamaju, Indonesia',
      emergencyPhone: '112',
      rwCode: '07',
      rtCode: '02',
      adminName: 'Admin Utama',
      adminEmail: 'admin@wargasejahtera.id',
      adminPassword: 'RahasiaAman123!',
    };

    await bootstrapInstallation(database, input);
    await expect(bootstrapInstallation(database, input)).rejects.toMatchObject({
      code: 'INSTALLATION_ALREADY_INITIALIZED',
      statusCode: 409,
    });
  }, 30000);
});
