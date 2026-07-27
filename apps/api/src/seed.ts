import { pathToFileURL } from 'node:url';
import {
  permissions,
  type Permission,
  type Role,
} from '@wargahub/contracts';
import { loadConfig } from './config.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { hashPassword } from './lib/auth.js';
import { rolePermissions } from './lib/policy.js';

export const demoIds = {
  organization: 'org_demo_wargahub',
  rw: 'rw_demo_05',
  rt: 'rt_demo_03',
  blockA: 'block_demo_a',
  blockB: 'block_demo_b',
  householdA: 'house_demo_a01',
  householdB: 'house_demo_b02',
  admin: 'user_demo_admin',
  treasurer: 'user_demo_treasurer',
  coordinator: 'user_demo_coordinator',
  resident: 'user_demo_resident',
  residentTwo: 'user_demo_resident_two',
  inactive: 'user_demo_inactive',
  cashAccount: 'cash_demo_main',
  billMain: 'bill_demo_main',
  billWaste: 'bill_demo_waste',
  complaint: 'complaint_demo_lamp',
  activity: 'activity_demo_garden',
  patrolA: 'patrol_demo_a',
  patrolB: 'patrol_demo_b',
} as const;

type SeedOptions = {
  includeInactiveUser?: boolean;
  includeSampleContent?: boolean;
};

async function insertRole(
  database: Database,
  organizationId: string,
  code: Role,
): Promise<string> {
  const id = `role_${code.toLowerCase()}`;
  await database.query(
    `INSERT INTO roles (id, organization_id, code, name)
     VALUES ($1, $2, $3, $4) ON CONFLICT (organization_id, code) DO NOTHING`,
    [id, organizationId, code, code.replaceAll('_', ' ')],
  );
  for (const permission of rolePermissions[code]) {
    await database.query(
      `INSERT INTO role_permissions (role_id, permission_code)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, permission],
    );
  }
  return id;
}

export async function seedDemoData(
  database: Database,
  options: SeedOptions = {},
): Promise<typeof demoIds> {
  const exists = await database.query<{ id: string }>(
    'SELECT id FROM organizations WHERE id = $1',
    [demoIds.organization],
  );
  if (exists.rows.length > 0) return demoIds;

  const passwordHash = await hashPassword('WargaHub123!');
  await database.query(
    `INSERT INTO organizations
      (id, name, short_name, slug, description, address, emergency_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      demoIds.organization,
      'Warga Harmoni',
      'RW Harmoni',
      'warga-harmoni',
      'Lingkungan yang aman, terbuka, dan saling menjaga tanpa tekanan sosial.',
      'Kelurahan Sukamaju, Indonesia',
      '112',
    ],
  );
  await database.query(
    'INSERT INTO rws (id, organization_id, code, name) VALUES ($1, $2, $3, $4)',
    [demoIds.rw, demoIds.organization, '05', 'RW 05'],
  );
  await database.query(
    'INSERT INTO rts (id, organization_id, rw_id, code, name) VALUES ($1, $2, $3, $4, $5)',
    [demoIds.rt, demoIds.organization, demoIds.rw, '03', 'RT 03'],
  );
  await database.query(
    `INSERT INTO blocks (id, organization_id, rt_id, code, name)
     VALUES ($1, $2, $3, $4, $5), ($6, $2, $3, $7, $8)`,
    [
      demoIds.blockA,
      demoIds.organization,
      demoIds.rt,
      'A',
      'Blok A',
      demoIds.blockB,
      'B',
      'Blok B',
    ],
  );
  await database.query(
    `INSERT INTO households
      (id, organization_id, rt_id, block_id, code, address, occupancy_status, ownership_status)
     VALUES
      ($1, $2, $3, $4, 'A-01', 'Jl. Harmoni Blok A No. 1', 'OCCUPIED', 'OWNER_OCCUPIED'),
      ($5, $2, $3, $6, 'B-02', 'Jl. Harmoni Blok B No. 2', 'OCCUPIED', 'RENTED')`,
    [
      demoIds.householdA,
      demoIds.organization,
      demoIds.rt,
      demoIds.blockA,
      demoIds.householdB,
      demoIds.blockB,
    ],
  );

  for (const permission of permissions) {
    await database.query(
      `INSERT INTO permissions (code, description) VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING`,
      [permission, permission.replaceAll('.', ' ')],
    );
  }

  const seededRoles: Array<[Role, string]> = [];
  for (const role of [
    'ADMIN_ORGANIZATION',
    'TREASURER',
    'SECURITY_COORDINATOR',
    'ACTIVITY_COORDINATOR',
    'AUDITOR',
    'RESIDENT',
  ] as const) {
    seededRoles.push([role, await insertRole(database, demoIds.organization, role)]);
  }

  const users = [
    [demoIds.admin, 'admin@demo.wargahub.id', 'Rina Pratiwi', 'ACTIVE'],
    [demoIds.treasurer, 'bendahara@demo.wargahub.id', 'Budi Santosa', 'ACTIVE'],
    [demoIds.coordinator, 'koordinator@demo.wargahub.id', 'Dimas Saputra', 'ACTIVE'],
    [demoIds.resident, 'warga@demo.wargahub.id', 'Ayu Lestari', 'ACTIVE'],
    [demoIds.residentTwo, 'warga2@demo.wargahub.id', 'Fajar Ramadhan', 'ACTIVE'],
    ...(options.includeInactiveUser
      ? ([[demoIds.inactive, 'inactive@demo.wargahub.id', 'Akun Nonaktif', 'INACTIVE']] as const)
      : []),
  ] as const;

  for (const [id, email, name, status] of users) {
    await database.query(
      `INSERT INTO users
        (id, organization_id, email, password_hash, name, status, privacy_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [id, demoIds.organization, email, passwordHash, name, status],
    );
  }
  await database.query(
    'UPDATE users SET phone = $1 WHERE id = $2 AND organization_id = $3',
    ['+6281234567890', demoIds.resident, demoIds.organization],
  );

  await database.query(
    `INSERT INTO household_members
      (id, organization_id, household_id, user_id, relationship, can_manage)
     VALUES
      ('member_demo_resident', $1, $2, $3, 'HEAD', TRUE),
      ('member_demo_resident_two', $1, $4, $5, 'HEAD', TRUE)`,
    [
      demoIds.organization,
      demoIds.householdA,
      demoIds.resident,
      demoIds.householdB,
      demoIds.residentTwo,
    ],
  );

  const roleId = Object.fromEntries(seededRoles) as Record<Role, string>;
  const assignments: Array<[string, Role]> = [
    [demoIds.admin, 'ADMIN_ORGANIZATION'],
    [demoIds.treasurer, 'TREASURER'],
    [demoIds.coordinator, 'SECURITY_COORDINATOR'],
    [demoIds.coordinator, 'ACTIVITY_COORDINATOR'],
    [demoIds.resident, 'RESIDENT'],
    [demoIds.residentTwo, 'RESIDENT'],
  ];
  for (const [userId, role] of assignments) {
    await database.query(
      `INSERT INTO user_roles
        (id, organization_id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, $4, 'ORGANIZATION', $2)`,
      [`user_role_${userId}_${role.toLowerCase()}`, demoIds.organization, userId, roleId[role]],
    );
  }

  await database.query(
    `INSERT INTO cash_accounts (id, organization_id, name, kind, masked_number)
     VALUES ($1, $2, 'Kas Utama', 'BANK', '**** 2045')`,
    [demoIds.cashAccount, demoIds.organization],
  );

  if (options.includeSampleContent !== false) {
  await database.query(
    `INSERT INTO announcements
      (id, organization_id, author_id, category, title, slug, summary, content,
       visibility, urgency, status, pinned, publish_at, published_at)
     VALUES
      ('announcement_demo_water', $1, $2, 'AIR_LISTRIK',
       'Pemeliharaan saluran air', 'pemeliharaan-saluran-air',
       'Aliran air Blok A akan dihentikan sementara Selasa pagi.',
       'Petugas akan melakukan pemeliharaan saluran pada Selasa pukul 09.00–11.00 WIB. Siapkan kebutuhan air secukupnya.',
       'PUBLIC', 'IMPORTANT', 'PUBLISHED', TRUE, '2026-07-25T01:00:00.000Z', '2026-07-25T01:00:00.000Z'),
      ('announcement_demo_meeting', $1, $2, 'KEGIATAN',
       'Rembuk warga bulan Agustus', 'rembuk-warga-agustus',
       'Rembuk warga tersedia secara luring dan melalui formulir aspirasi.',
       'Warga dapat hadir di balai warga atau mengirim aspirasi tertulis sebelum acara. Kehadiran tidak diwajibkan.',
       'PUBLIC', 'NORMAL', 'PUBLISHED', FALSE, '2026-07-24T01:00:00.000Z', '2026-07-24T01:00:00.000Z'),
      ('announcement_demo_security', $1, $3, 'KEAMANAN',
       'Pembaruan jadwal ronda', 'pembaruan-jadwal-ronda',
       'Jadwal ronda Agustus telah tersedia di portal warga.',
       'Silakan periksa jadwal Anda. Pertukaran jadwal, kontribusi pengganti, dan dispensasi dapat diajukan melalui portal.',
       'RESIDENT', 'NORMAL', 'PUBLISHED', FALSE, '2026-07-26T01:00:00.000Z', '2026-07-26T01:00:00.000Z')`,
    [demoIds.organization, demoIds.admin, demoIds.coordinator],
  );

  await database.query(
    `INSERT INTO bills
      (id, organization_id, household_id, created_by, title, description, period,
       kind, recurrence, amount, due_at)
     VALUES
      ($1, $2, $3, $4, 'Iuran lingkungan Juli',
       'Operasional keamanan dan kebersihan lingkungan bulan Juli.',
       '2026-07', 'MANDATORY', 'MONTHLY', 150000, '2026-07-31T16:59:59.000Z'),
      ($5, $2, $3, $4, 'Iuran sampah Juli',
       'Biaya pengangkutan sampah rumah tangga bulan Juli.',
       '2026-07', 'MANDATORY', 'MONTHLY', 50000, '2026-07-31T16:59:59.000Z')`,
    [
      demoIds.billMain,
      demoIds.organization,
      demoIds.householdA,
      demoIds.treasurer,
      demoIds.billWaste,
    ],
  );

  await database.query(
    `INSERT INTO finance_transactions
      (id, organization_id, cash_account_id, created_by, reviewed_by, kind,
       category, description, amount, status, occurred_at)
     VALUES
      ('finance_demo_income', $1, $2, $3, $3, 'INCOME', 'Saldo awal',
       'Saldo awal kas lingkungan', 8500000, 'POSTED', '2026-07-01T01:00:00.000Z'),
      ('finance_demo_expense', $1, $2, $3, $3, 'EXPENSE', 'Kebersihan',
       'Perlengkapan kebersihan bersama', 1250000, 'POSTED', '2026-07-18T01:00:00.000Z')`,
    [demoIds.organization, demoIds.cashAccount, demoIds.treasurer],
  );

  await database.query(
    `INSERT INTO complaints
      (id, organization_id, ticket_number, reporter_id, assigned_to, category,
       title, description, visibility, location, priority, status)
     VALUES ($1, $2, 'WH-2026-0142', $3, $4, 'FASILITAS',
       'Lampu jalan dekat Blok A padam',
       'Lampu di dekat tikungan Blok A padam dan membuat area cukup gelap.',
       'PRIVATE', 'Tikungan Blok A', 'HIGH', 'IN_PROGRESS')`,
    [
      demoIds.complaint,
      demoIds.organization,
      demoIds.resident,
      demoIds.coordinator,
    ],
  );
  await database.query(
    `INSERT INTO complaint_status_histories
      (id, organization_id, complaint_id, actor_id, from_status, to_status, message)
     VALUES
      ('history_demo_submitted', $1, $2, $3, NULL, 'SUBMITTED', 'Pengaduan dikirim.'),
      ('history_demo_progress', $1, $2, $4, 'ASSIGNED', 'IN_PROGRESS', 'Petugas sedang memeriksa instalasi lampu.')`,
    [demoIds.organization, demoIds.complaint, demoIds.resident, demoIds.coordinator],
  );

  await database.query(
    `INSERT INTO activities
      (id, organization_id, coordinator_id, title, description, location,
       starts_at, ends_at, capacity, status)
     VALUES ($1, $2, $3, 'Kerja bakti taman',
       'Membersihkan dan merapikan taman bersama dengan pilihan kontribusi yang fleksibel.',
       'Taman RW', '2026-08-02T00:00:00.000Z', '2026-08-02T03:00:00.000Z', 30, 'PUBLISHED')`,
    [demoIds.activity, demoIds.organization, demoIds.coordinator],
  );
  await database.query(
    `INSERT INTO activity_needs
      (id, organization_id, activity_id, contribution_type, target)
     VALUES
      ('need_demo_attend', $1, $2, 'HADIR', 12),
      ('need_demo_food', $1, $2, 'KONSUMSI', 4),
      ('need_demo_docs', $1, $2, 'DOKUMENTASI', 1)`,
    [demoIds.organization, demoIds.activity],
  );

  await database.query(
    `INSERT INTO patrol_assignments
      (id, organization_id, user_id, starts_at, ends_at, area)
     VALUES
      ($1, $2, $3, '2026-08-04T15:00:00.000Z', '2026-08-04T18:00:00.000Z', 'Gerbang dan Blok A'),
      ($4, $2, $5, '2026-08-11T15:00:00.000Z', '2026-08-11T18:00:00.000Z', 'Gerbang dan Blok B')`,
    [
      demoIds.patrolA,
      demoIds.organization,
      demoIds.resident,
      demoIds.patrolB,
      demoIds.residentTwo,
    ],
  );

  await database.query(
    `INSERT INTO documents
      (id, organization_id, owner_id, title, slug, description, category,
       visibility, current_version, published_at)
     VALUES
      ('document_demo_rules', $1, $2, 'Panduan hidup bertetangga',
       'panduan-hidup-bertetangga', 'Panduan singkat ketertiban dan komunikasi lingkungan.',
       'Peraturan', 'PUBLIC', 1, '2026-07-10T01:00:00.000Z'),
      ('document_demo_minutes', $1, $2, 'Notulen rapat Juli',
       'notulen-rapat-juli', 'Catatan hasil rapat pengurus dan perwakilan warga.',
       'Notulen', 'INTERNAL', 1, '2026-07-15T01:00:00.000Z')`,
    [demoIds.organization, demoIds.admin],
  );

  await database.query(
    `INSERT INTO notifications
      (id, organization_id, user_id, kind, title, message, action_url, deduplication_key)
     VALUES
      ('notification_demo_bill', $1, $2, 'BILL_DUE', 'Dua tagihan perlu perhatian',
       'Periksa tagihan lingkungan sebelum 31 Juli.', '/app/tagihan', 'demo-bill-due'),
      ('notification_demo_patrol', $1, $2, 'PATROL_REMINDER', 'Jadwal ronda mendatang',
       'Jadwal ronda Anda tersedia dan dapat ditukar bila perlu.', '/app/ronda', 'demo-patrol-reminder')`,
    [demoIds.organization, demoIds.resident],
  );
  }

  return demoIds;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const database = await createDatabase({
    ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
    dataDir: config.PGLITE_DATA_DIR,
  });
  try {
    await runMigrations(database);
    await seedDemoData(database);
    process.stdout.write('Demo data ready.\n');
  } finally {
    await database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
