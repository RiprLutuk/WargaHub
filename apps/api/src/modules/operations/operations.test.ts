import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { rolePermissions } from '../../lib/policy.js';
import { demoIds, seedDemoData } from '../../seed.js';

type AuthHeaders = { cookie: string; 'x-csrf-token': string };

describe('community operation workflows', () => {
  let database: Database;
  let app: FastifyInstance;

  async function login(email: string): Promise<AuthHeaders> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WargaHub123!' },
    });
    const setCookie = response.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
    if (!cookie) throw new Error('Login cookie missing');
    return { cookie, 'x-csrf-token': response.json().data.csrfToken as string };
  }

  async function grantRole(
    userId: string,
    role: Extract<Role, 'OFFICER' | 'VENDOR'>,
    scopeType: 'ORGANIZATION' | 'RT' = 'ORGANIZATION',
    scopeId: string = demoIds.organization,
  ) {
    const roleId = `role_test_${role.toLowerCase()}`;
    await database.query(
      `INSERT INTO roles (id, organization_id, code, name)
       VALUES ($1, $2, $3, $3)`,
      [roleId, demoIds.organization, role],
    );
    for (const permission of rolePermissions[role]) {
      await database.query(
        `INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2)`,
        [roleId, permission],
      );
    }
    await database.query(
      `INSERT INTO user_roles
        (id, organization_id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        `user_role_test_${role.toLowerCase()}_${scopeType.toLowerCase()}`,
        demoIds.organization,
        userId,
        roleId,
        scopeType,
        scopeId,
      ],
    );
  }

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    app = await buildApp({ database, logger: false });
  }, 30000);

  afterEach(async () => {
    await app?.close();
    await database?.close();
  });

  it('keeps private complaints hidden and records assignment/status history', async () => {
    const residentA = await login('warga@demo.wargahub.id');
    const residentB = await login('warga2@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/complaints',
      headers: residentA,
      payload: {
        category: 'FASILITAS',
        title: 'Lampu jalan padam',
        description: 'Lampu di depan Blok A padam sejak dua malam lalu.',
        visibility: 'PRIVATE',
        priority: 'HIGH',
        location: 'Depan Blok A',
      },
    });
    const id = created.json().data.id as string;
    const hidden = await app.inject({
      method: 'GET',
      url: `/api/v1/complaints/${id}`,
      headers: residentB,
    });
    expect(hidden.statusCode).toBe(404);

    const assigned = await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/assign`,
      headers: admin,
      payload: { assigneeId: demoIds.coordinator },
    });
    const progressed = await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/status`,
      headers: admin,
      payload: { status: 'IN_PROGRESS', message: 'Petugas sedang memeriksa lampu.' },
    });
    const visible = await app.inject({
      method: 'GET',
      url: `/api/v1/complaints/${id}`,
      headers: residentA,
    });

    expect(assigned.statusCode).toBe(200);
    expect(progressed.statusCode).toBe(200);
    expect(visible.json().data.history.at(-1).status).toBe('IN_PROGRESS');
  });

  it('keeps internal complaint comments away from the reporter view', async () => {
    const resident = await login('warga@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/complaints',
      headers: resident,
      payload: {
        category: 'KEBERSIHAN',
        title: 'Sampah belum diangkut',
        description: 'Sampah rumah tangga belum diangkut selama dua hari.',
        visibility: 'PRIVATE',
        priority: 'NORMAL',
      },
    });
    const id = created.json().data.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/comments`,
      headers: resident,
      payload: { body: 'Mohon kabari bila petugas sudah dijadwalkan.', visibility: 'REPORTER' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/comments`,
      headers: admin,
      payload: { body: 'Koordinasikan kontrak vendor sebelum menjawab.', visibility: 'INTERNAL' },
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/complaints/${id}`,
      headers: resident,
    });
    expect(detail.json().data.comments).toHaveLength(1);
    expect(detail.body).not.toContain('kontrak vendor');
  });

  it('rejects assigning a complaint to a resident without complaint handling permission', async () => {
    const reporter = await login('warga@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/complaints',
      headers: reporter,
      payload: {
        category: 'KEAMANAN',
        title: 'Akses gerbang bermasalah',
        description: 'Gerbang tidak dapat ditutup dan harus ditangani petugas berwenang.',
        visibility: 'PRIVATE',
        priority: 'HIGH',
      },
    });
    const id = created.json().data.id as string;

    const rejected = await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/assign`,
      headers: admin,
      payload: { assigneeId: demoIds.residentTwo },
    });
    const unchanged = await app.inject({
      method: 'GET',
      url: `/api/v1/complaints/${id}`,
      headers: admin,
    });

    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().error.code).toBe('ASSIGNEE_NOT_ELIGIBLE');
    expect(unchanged.json().data).toMatchObject({ assignedTo: null, status: 'SUBMITTED' });
  });

  it('rejects assigning a complaint worker whose handling role is not organization-scoped', async () => {
    await grantRole(demoIds.residentTwo, 'OFFICER', 'RT', demoIds.rt);
    const reporter = await login('warga@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/complaints',
      headers: reporter,
      payload: {
        category: 'FASILITAS',
        title: 'Kerusakan fasilitas lintas wilayah',
        description: 'Penanganan membutuhkan petugas dengan mandat tingkat organisasi.',
        visibility: 'PRIVATE',
        priority: 'NORMAL',
      },
    });
    const id = created.json().data.id as string;

    const rejected = await app.inject({
      method: 'POST',
      url: `/api/v1/complaints/${id}/assign`,
      headers: admin,
      payload: { assigneeId: demoIds.residentTwo },
    });

    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().error.code).toBe('ASSIGNEE_NOT_ELIGIBLE');
  });

  it.each(['OFFICER', 'VENDOR'] as const)(
    'lets an %s handle private complaints only after assignment',
    async (role) => {
      await grantRole(demoIds.residentTwo, role);
      const reporter = await login('warga@demo.wargahub.id');
      const worker = await login('warga2@demo.wargahub.id');
      const admin = await login('admin@demo.wargahub.id');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/complaints',
        headers: reporter,
        payload: {
          category: 'KEAMANAN',
          title: 'Pagar samping rusak',
          description: 'Pagar samping terbuka dan perlu segera diperiksa petugas.',
          visibility: 'PRIVATE',
          priority: 'HIGH',
        },
      });
      const id = created.json().data.id as string;

      const unassignedList = await app.inject({
        method: 'GET',
        url: '/api/v1/complaints',
        headers: worker,
      });
      const unassignedDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: worker,
      });
      const unassignedStatusChange = await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/status`,
        headers: worker,
        payload: { status: 'VERIFIED', message: 'Perubahan tanpa penugasan.' },
      });
      const unchanged = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: admin,
      });

      expect(
        unassignedList.json().data.some((complaint: { id: string }) => complaint.id === id),
      ).toBe(false);
      expect(unassignedDetail.statusCode).toBe(404);
      expect(unassignedStatusChange.statusCode).toBe(404);
      expect(unchanged.json().data.status).toBe('SUBMITTED');

      const assigned = await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/assign`,
        headers: admin,
        payload: { assigneeId: demoIds.residentTwo },
      });
      const assignedDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: worker,
      });
      const assignedStatusChange = await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/status`,
        headers: worker,
        payload: { status: 'IN_PROGRESS', message: 'Petugas mulai menangani.' },
      });

      expect(assigned.statusCode).toBe(200);
      expect(assignedDetail.statusCode).toBe(200);
      expect(assignedDetail.json().data).toMatchObject({
        id,
        reporterId: demoIds.resident,
        assignedTo: demoIds.residentTwo,
      });
      expect(assignedStatusChange.statusCode).toBe(200);
      expect(assignedStatusChange.json().data.status).toBe('IN_PROGRESS');
    },
  );

  it.each(['OFFICER', 'VENDOR'] as const)(
    'rejects an unassigned %s changing a public complaint',
    async (role) => {
      await grantRole(demoIds.residentTwo, role);
      const reporter = await login('warga@demo.wargahub.id');
      const worker = await login('warga2@demo.wargahub.id');
      const admin = await login('admin@demo.wargahub.id');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/complaints',
        headers: reporter,
        payload: {
          category: 'KEBERSIHAN',
          title: 'Sampah di area publik',
          description: 'Tumpukan sampah dapat dilihat warga tetapi hanya petugas terkait yang menangani.',
          visibility: 'PUBLIC',
          priority: 'NORMAL',
        },
      });
      const id = created.json().data.id as string;

      const statusChange = await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/status`,
        headers: worker,
        payload: { status: 'VERIFIED', message: 'Perubahan tanpa penugasan.' },
      });
      const unchanged = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: admin,
      });

      expect(statusChange.statusCode).toBe(403);
      expect(unchanged.json().data.status).toBe('SUBMITTED');
    },
  );

  it.each(['OFFICER', 'VENDOR'] as const)(
    'sanitizes a public complaint for an unrelated %s and restores details after assignment',
    async (role) => {
      await grantRole(demoIds.residentTwo, role);
      const reporter = await login('warga@demo.wargahub.id');
      const worker = await login('warga2@demo.wargahub.id');
      const admin = await login('admin@demo.wargahub.id');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/complaints',
        headers: reporter,
        payload: {
          category: 'KEBERSIHAN',
          title: 'Sampah di taman umum',
          description: 'Terdapat tumpukan sampah di sisi timur taman umum.',
          visibility: 'PUBLIC',
          priority: 'NORMAL',
        },
      });
      const id = created.json().data.id as string;
      await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/comments`,
        headers: reporter,
        payload: { body: 'Saya dapat menunjukkan lokasi tepatnya.', visibility: 'REPORTER' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/comments`,
        headers: admin,
        payload: { body: 'Periksa jadwal vendor kebersihan.', visibility: 'INTERNAL' },
      });

      const publicList = await app.inject({
        method: 'GET',
        url: '/api/v1/complaints',
        headers: worker,
      });
      const publicDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: worker,
      });
      const publicListItem = publicList
        .json()
        .data.find((complaint: { id: string }) => complaint.id === id);

      expect(publicListItem).toBeDefined();
      expect(publicListItem).not.toHaveProperty('reporterId');
      expect(publicListItem).not.toHaveProperty('assignedTo');
      expect(publicDetail.statusCode).toBe(200);
      expect(publicDetail.json().data).not.toHaveProperty('reporterId');
      expect(publicDetail.json().data).not.toHaveProperty('assignedTo');
      expect(publicDetail.json().data).not.toHaveProperty('history');
      expect(publicDetail.json().data).not.toHaveProperty('comments');

      const assigned = await app.inject({
        method: 'POST',
        url: `/api/v1/complaints/${id}/assign`,
        headers: admin,
        payload: { assigneeId: demoIds.residentTwo },
      });
      const assignedDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: worker,
      });
      const reporterDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: reporter,
      });
      const managerDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/complaints/${id}`,
        headers: admin,
      });

      expect(assigned.statusCode).toBe(200);
      expect(assignedDetail.json().data).toMatchObject({
        reporterId: demoIds.resident,
        assignedTo: demoIds.residentTwo,
      });
      expect(assignedDetail.json().data.history.length).toBeGreaterThan(0);
      expect(assignedDetail.json().data.comments).toHaveLength(2);
      expect(reporterDetail.json().data.reporterId).toBe(demoIds.resident);
      expect(reporterDetail.json().data.history.length).toBeGreaterThan(0);
      expect(reporterDetail.json().data.comments).toHaveLength(1);
      expect(managerDetail.json().data.comments).toHaveLength(2);
    },
  );

  it('tracks alternative contributions and remaining activity needs', async () => {
    const coordinator = await login('koordinator@demo.wargahub.id');
    const resident = await login('warga@demo.wargahub.id');
    const activity = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: coordinator,
      payload: {
        title: 'Kerja bakti taman',
        description: 'Membersihkan dan merapikan taman bersama pada akhir pekan.',
        location: 'Taman RW',
        startsAt: '2026-08-02T00:00:00.000Z',
        endsAt: '2026-08-02T03:00:00.000Z',
        needs: [
          { type: 'HADIR', target: 8 },
          { type: 'KONSUMSI', target: 3 },
          { type: 'DOKUMENTASI', target: 1 },
        ],
      },
    });
    const id = activity.json().data.id as string;
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${id}/responses`,
      headers: resident,
      payload: { contributionType: 'DOKUMENTASI', quantity: 1 },
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/activities/${id}`,
      headers: resident,
    });

    expect(response.statusCode).toBe(200);
    expect(
      detail.json().data.needs.find((need: { type: string }) => need.type === 'DOKUMENTASI'),
    ).toMatchObject({ target: 1, committed: 1, remaining: 0 });
  });

  it('accepts a patrol swap once and atomically exchanges assignments', async () => {
    const coordinator = await login('koordinator@demo.wargahub.id');
    const residentA = await login('warga@demo.wargahub.id');
    const residentB = await login('warga2@demo.wargahub.id');
    const createAssignment = async (userId: string, day: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/patrol-assignments',
        headers: coordinator,
        payload: {
          userId,
          startsAt: `${day}T15:00:00.000Z`,
          endsAt: `${day}T18:00:00.000Z`,
          area: 'Gerbang dan Blok A',
        },
      });
    const assignmentA = await createAssignment(demoIds.resident, '2026-08-04');
    const assignmentB = await createAssignment(demoIds.residentTwo, '2026-08-11');
    const residentSchedule = await app.inject({
      method: 'GET',
      url: '/api/v1/patrol-assignments',
      headers: residentA,
    });
    const coordinatorSchedule = await app.inject({
      method: 'GET',
      url: '/api/v1/patrol-assignments',
      headers: coordinator,
    });
    expect(residentSchedule.json().data).toHaveLength(1);
    expect(residentSchedule.json().data[0].userId).toBe(demoIds.resident);
    expect(coordinatorSchedule.json().data).toHaveLength(2);
    const swap = await app.inject({
      method: 'POST',
      url: `/api/v1/patrol-assignments/${assignmentA.json().data.id}/swap-request`,
      headers: residentA,
      payload: {
        targetAssignmentId: assignmentB.json().data.id,
        reason: 'Saya mendapat jadwal shift malam.',
      },
    });
    const assignmentC = await createAssignment(demoIds.resident, '2026-08-18');
    const conflictingSwap = await app.inject({
      method: 'POST',
      url: `/api/v1/patrol-assignments/${assignmentC.json().data.id}/swap-request`,
      headers: residentA,
      payload: {
        targetAssignmentId: assignmentB.json().data.id,
        reason: 'Mencoba memakai jadwal target yang sedang diproses.',
      },
    });
    expect(conflictingSwap.statusCode).toBe(409);
    expect(conflictingSwap.json().error.code).toBe('PATROL_SWAP_NOT_ALLOWED');
    const accepted = await app.inject({
      method: 'POST',
      url: `/api/v1/patrol-swap-requests/${swap.json().data.id}/accept`,
      headers: residentB,
    });
    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/patrol-swap-requests/${swap.json().data.id}/approve`,
      headers: coordinator,
    });

    expect(accepted.json().data.status).toBe('ACCEPTED');
    expect(approved.json().data.status).toBe('APPROVED');
    expect(approved.json().data.assignments.map((item: { userId: string }) => item.userId)).toEqual([
      demoIds.residentTwo,
      demoIds.resident,
    ]);
  });
});
