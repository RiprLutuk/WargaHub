import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { demoIds, seedDemoData } from '../../seed.js';
import { contentRoutes } from './routes.js';

type AuthSession = {
  cookie: string;
  csrfToken: string;
};

describe('content and resident directory API', () => {
  let database: Database;
  let app: FastifyInstance;
  let uploadDirectory: string;

  beforeEach(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    uploadDirectory = await mkdtemp(join(tmpdir(), 'wargahub-content-'));
    app = await buildApp({
      database,
      config: loadConfig({ NODE_ENV: 'test', UPLOAD_DIR: uploadDirectory }),
      logger: false,
    });
    if (!app.hasRoute({ method: 'GET', url: '/api/v1/public/site' })) {
      await app.register(contentRoutes, { prefix: '/api/v1' });
    }
  });

  afterEach(async () => {
    await app.close();
    await database.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  });

  async function login(email: string): Promise<AuthSession> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WargaHub123!' },
    });
    expect(response.statusCode).toBe(200);
    const setCookie = response.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
    if (!cookie) throw new Error('Session cookie missing');
    return { cookie, csrfToken: response.json().data.csrfToken as string };
  }

  async function injectAs(
    session: AuthSession,
    options: InjectOptions,
  ) {
    return app.inject({
      ...options,
      headers: {
        ...options.headers,
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
    });
  }

  it('does not let one household read another household record', async () => {
    const resident = await login('warga@demo.wargahub.id');

    const own = await injectAs(resident, {
      method: 'GET',
      url: `/api/v1/households/${demoIds.householdA}`,
    });
    const other = await injectAs(resident, {
      method: 'GET',
      url: `/api/v1/households/${demoIds.householdB}`,
    });

    expect(own.statusCode).toBe(200);
    expect(own.json().data.id).toBe(demoIds.householdA);
    expect(own.body).not.toContain('privateNotes');
    expect(other.statusCode).toBe(404);
  });

  it('paginates and filters household and resident admin lists', async () => {
    const admin = await login('admin@demo.wargahub.id');

    const households = await injectAs(admin, {
      method: 'GET',
      url: '/api/v1/households?page=1&pageSize=1&search=A-01',
    });
    const residents = await injectAs(admin, {
      method: 'GET',
      url: '/api/v1/residents?page=1&pageSize=1&search=Ayu',
    });

    expect(households.statusCode).toBe(200);
    expect(households.json()).toMatchObject({
      data: [{ id: demoIds.householdA, code: 'A-01' }],
      meta: { page: 1, pageSize: 1, total: 1 },
    });
    expect(residents.statusCode).toBe(200);
    expect(residents.json()).toMatchObject({
      data: [{ id: demoIds.resident, name: 'Ayu Lestari' }],
      meta: { page: 1, pageSize: 1, total: 1 },
    });
  });

  it('lets administrators maintain the organization and directory but not residents', async () => {
    const admin = await login('admin@demo.wargahub.id');
    const resident = await login('warga@demo.wargahub.id');

    const organization = await injectAs(admin, {
      method: 'GET',
      url: '/api/v1/organization',
    });
    expect(organization.statusCode).toBe(200);
    expect(organization.json().data.modules).toMatchObject({ billing: true });

    const residentUpdate = await injectAs(resident, {
      method: 'PATCH',
      url: '/api/v1/organization',
      payload: {
        name: 'Nama yang tidak boleh disimpan',
        shortName: 'Terlarang',
        description: 'Perubahan ini harus ditolak oleh policy pada backend.',
        address: 'Alamat perubahan yang tidak sah',
        emergencyPhone: '021555555',
        timezone: 'Asia/Jakarta',
        locale: 'id-ID',
      },
    });
    expect(residentUpdate.statusCode).toBe(403);

    const createdHousehold = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/households',
      payload: {
        code: 'A-09',
        address: 'Jl. Harmoni Blok A No. 9',
        rw: '05',
        rt: '03',
        block: 'A',
        occupancyStatus: 'OCCUPIED',
        ownershipStatus: 'RENTED',
      },
    });
    expect(createdHousehold.statusCode).toBe(201);

    const normalizedHousehold = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/households',
      payload: {
        code: 'c-11',
        address: 'Jl. Harmoni Blok A No. 11',
        rw: '05',
        rt: '03',
        block: 'A',
        occupancyStatus: 'OCCUPIED',
        ownershipStatus: 'OWNER_OCCUPIED',
      },
    });
    expect(normalizedHousehold.statusCode).toBe(201);
    expect(normalizedHousehold.json().data.code).toBe('C-11');

    const updatedHousehold = await injectAs(admin, {
      method: 'PATCH',
      url: `/api/v1/households/${createdHousehold.json().data.id}`,
      payload: {
        address: 'Jl. Harmoni Blok A No. 9A',
        occupancyStatus: 'EMPTY',
        ownershipStatus: 'OTHER',
        block: 'A',
      },
    });
    expect(updatedHousehold.statusCode).toBe(200);
    expect(updatedHousehold.json().data).toMatchObject({
      address: 'Jl. Harmoni Blok A No. 9A',
      occupancyStatus: 'EMPTY',
      ownershipStatus: 'OTHER',
    });

    const createdResident = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/residents',
      payload: {
        householdId: createdHousehold.json().data.id,
        name: 'Nadia Permata',
        email: 'nadia@example.test',
        relationship: 'TENANT',
        participationPreferences: ['DOKUMENTASI'],
      },
    });
    expect(createdResident.statusCode).toBe(201);
    expect(createdResident.json().data).toMatchObject({
      name: 'Nadia Permata',
      householdId: createdHousehold.json().data.id,
      status: 'INVITED',
    });
    expect(createdResident.body).not.toContain('password');

    const inviteJob = await database.query<{ payload: string | { text: string } }>(
      `SELECT payload FROM jobs WHERE kind = 'SEND_EMAIL'
       ORDER BY created_at DESC LIMIT 1`,
    );
    const invitePayload = typeof inviteJob.rows[0]?.payload === 'string'
      ? (JSON.parse(inviteJob.rows[0].payload) as { text: string })
      : inviteJob.rows[0]?.payload;
    expect(invitePayload?.text).toContain('/accept-invitation#token=');
    expect(invitePayload?.text).not.toContain('/accept-invitation?token=');
    const inviteToken = invitePayload?.text.match(/token=([^\s]+)/)?.[1];
    expect(inviteToken).toBeTruthy();
    const accepted = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/accept-invitation',
      payload: { token: inviteToken, password: 'NadiaAman123!' },
    });
    const acceptedAgain = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/accept-invitation',
      payload: { token: inviteToken, password: 'NadiaAman123!' },
    });
    const residentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nadia@example.test', password: 'NadiaAman123!' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(acceptedAgain.statusCode).toBe(400);
    expect(residentLogin.statusCode).toBe(200);
    expect(residentLogin.json().data.user.roles).toContain('RESIDENT');
    expect(residentLogin.json().data.user.householdIds).toContain(
      createdHousehold.json().data.id,
    );
  });

  it('keeps drafts and scheduled announcements private until publication', async () => {
    const admin = await login('admin@demo.wargahub.id');
    const created = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/announcements',
      payload: {
        category: 'UMUM',
        title: 'Jadwal pelayanan sekretariat',
        summary: 'Pelayanan sekretariat berpindah ke hari Sabtu pagi.',
        content: 'Mulai pekan ini pelayanan sekretariat dibuka setiap Sabtu pukul delapan.',
        visibility: 'PUBLIC',
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().data.status).toBe('DRAFT');
    const announcementId = created.json().data.id as string;

    const residentOnly = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/announcements',
      payload: {
        category: 'KEUANGAN',
        title: 'Informasi kas khusus warga',
        summary: 'Ringkasan kas ini hanya ditujukan bagi warga terautentikasi.',
        content: 'Informasi internal ini tidak boleh muncul pada halaman publik lingkungan.',
        visibility: 'RESIDENT',
      },
    });
    expect(residentOnly.statusCode).toBe(201);
    const residentOnlyPublished = await injectAs(admin, {
      method: 'POST',
      url: `/api/v1/announcements/${residentOnly.json().data.id}/publish`,
    });
    expect(residentOnlyPublished.statusCode).toBe(200);

    const edited = await injectAs(admin, {
      method: 'PATCH',
      url: `/api/v1/announcements/${announcementId}`,
      payload: {
        summary: 'Pelayanan sekretariat kini tersedia setiap hari Sabtu pagi.',
        content: 'Mulai pekan ini pelayanan sekretariat dibuka setiap Sabtu pukul delapan sampai sebelas.',
      },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().data).toMatchObject({
      status: 'DRAFT',
      version: 2,
      summary: 'Pelayanan sekretariat kini tersedia setiap hari Sabtu pagi.',
    });

    const scheduled = await injectAs(admin, {
      method: 'POST',
      url: `/api/v1/announcements/${announcementId}/schedule`,
      payload: { publishAt: '2099-08-01T01:00:00.000Z' },
    });
    expect(scheduled.statusCode).toBe(200);
    expect(scheduled.json().data.status).toBe('SCHEDULED');

    const beforePublish = await app.inject({
      method: 'GET',
      url: '/api/v1/public/announcements',
    });
    expect(beforePublish.statusCode).toBe(200);
    expect(beforePublish.json().data).toHaveLength(0);

    const published = await injectAs(admin, {
      method: 'POST',
      url: `/api/v1/announcements/${announcementId}/publish`,
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().data.status).toBe('PUBLISHED');
    expect(new Date(published.json().data.publishAt).getTime()).toBeLessThan(
      Date.now() + 1_000,
    );

    const publicResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/public/announcements',
    });
    expect(publicResponse.statusCode).toBe(200);
    expect(publicResponse.json().data).toHaveLength(1);
    expect(
      publicResponse
        .json()
        .data.every(
          (item: { visibility: string; status: string }) =>
            item.visibility === 'PUBLIC' && item.status === 'PUBLISHED',
        ),
    ).toBe(true);

    const resident = await login('warga@demo.wargahub.id');
    const acknowledged = await injectAs(resident, {
      method: 'POST',
      url: `/api/v1/announcements/${announcementId}/acknowledge`,
    });
    expect(acknowledged.statusCode).toBe(200);
    const reads = await database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM announcement_reads
       WHERE announcement_id = $1 AND user_id = $2`,
      [announcementId, demoIds.resident],
    );
    expect(reads.rows[0]?.total).toBe(1);

    const archived = await injectAs(admin, {
      method: 'POST',
      url: `/api/v1/announcements/${announcementId}/archive`,
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().data.status).toBe('ARCHIVED');
    const afterArchive = await app.inject({
      method: 'GET',
      url: '/api/v1/public/announcements',
    });
    expect(afterArchive.json().data).toHaveLength(0);
  });

  it('publishes documents through a public projection without file or owner data', async () => {
    const admin = await login('admin@demo.wargahub.id');
    const fileId = 'file_demo_public_document';
    const storageKey = `${demoIds.organization}/panduan-darurat.pdf`;
    await mkdir(join(uploadDirectory, demoIds.organization), { recursive: true });
    await writeFile(join(uploadDirectory, storageKey), '%PDF-1.7\nWargaHub test document');
    await database.query(
      `INSERT INTO files
        (id, organization_id, owner_user_id, storage_key, original_name,
         mime_type, size_bytes, checksum_sha256, visibility)
       VALUES ($1, $2, $3, $4, 'panduan-darurat.pdf', 'application/pdf', 32,
               'checksum-demo-document', 'PRIVATE')`,
      [fileId, demoIds.organization, demoIds.admin, storageKey],
    );
    const created = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        title: 'Panduan keadaan darurat',
        description: 'Panduan singkat saat terjadi keadaan darurat lingkungan.',
        category: 'SOP',
        visibility: 'PUBLIC',
        fileId,
      },
    });
    expect(created.statusCode).toBe(201);

    const beforePublish = await app.inject({
      method: 'GET',
      url: '/api/v1/public/documents',
    });
    expect(beforePublish.json().data).toHaveLength(0);

    const published = await injectAs(admin, {
      method: 'POST',
      url: `/api/v1/documents/${created.json().data.id}/publish`,
    });
    expect(published.statusCode).toBe(200);

    const publicResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/public/documents',
    });
    expect(publicResponse.statusCode).toBe(200);
    expect(publicResponse.json().data).toHaveLength(1);
    expect(publicResponse.json().data[0]).toMatchObject({
      title: 'Panduan keadaan darurat',
      visibility: 'PUBLIC',
      downloadUrl: `/api/v1/public/documents/${created.json().data.id}/download`,
    });
    expect(publicResponse.body).not.toContain('ownerId');
    expect(publicResponse.body).not.toContain('fileId');
    expect(publicResponse.body).not.toContain('checksum');
    const publicDownload = await app.inject({
      method: 'GET',
      url: `/api/v1/public/documents/${created.json().data.id}/download`,
    });
    expect(publicDownload.statusCode).toBe(200);
    expect(publicDownload.headers['content-type']).toContain('application/pdf');
    expect(publicDownload.body).toContain('%PDF-1.7');

    const internalFileId = 'file_demo_internal_document';
    const internalStorageKey = `${demoIds.organization}/notulen-warga.pdf`;
    await writeFile(
      join(uploadDirectory, internalStorageKey),
      '%PDF-1.7\nWargaHub internal test document',
    );
    await database.query(
      `INSERT INTO files
        (id, organization_id, owner_user_id, storage_key, original_name,
         mime_type, size_bytes, checksum_sha256, visibility)
       VALUES ($1, $2, $3, $4, 'notulen-warga.pdf', 'application/pdf', 41,
               'checksum-demo-internal-document', 'PRIVATE')`,
      [internalFileId, demoIds.organization, demoIds.admin, internalStorageKey],
    );
    const internal = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        title: 'Notulen rapat warga',
        description: 'Notulen yang hanya dapat dibaca penghuni terautentikasi.',
        category: 'NOTULEN',
        visibility: 'INTERNAL',
        fileId: internalFileId,
      },
    });
    expect(internal.statusCode).toBe(201);
    const resident = await login('warga@demo.wargahub.id');
    const residentDocuments = await injectAs(resident, {
      method: 'GET',
      url: '/api/v1/documents?search=Notulen',
    });
    expect(residentDocuments.statusCode).toBe(200);
    expect(residentDocuments.json().data).toEqual([
      expect.objectContaining({
        id: internal.json().data.id,
        visibility: 'INTERNAL',
        downloadUrl: `/api/v1/documents/${internal.json().data.id}/download`,
      }),
    ]);
    const internalDownload = await injectAs(resident, {
      method: 'GET',
      url: `/api/v1/documents/${internal.json().data.id}/download`,
    });
    expect(internalDownload.statusCode).toBe(200);
    expect(internalDownload.body).toContain('%PDF-1.7');
    const publicAfterInternal = await app.inject({
      method: 'GET',
      url: '/api/v1/public/documents',
    });
    expect(publicAfterInternal.json().data).toHaveLength(1);
  });

  it('exposes a sanitized public organization projection', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/public/site' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      slug: 'warga-harmoni',
      name: 'Warga Harmoni',
      emergencyPhone: '112',
    });
    expect(response.body).not.toContain('modules');
    expect(response.body).not.toContain('createdAt');
  });

  it('imports validated household CSV atomically and exports only directory fields', async () => {
    const admin = await login('admin@demo.wargahub.id');
    const csv = [
      'code,address,rw,rt,block,occupancyStatus,ownershipStatus',
      'c-03,"Jl. Harmoni, Blok A No. 3",05,03,A,OCCUPIED,RENTED',
    ].join('\n');

    const imported = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/households/import',
      headers: { 'content-type': 'text/csv' },
      payload: csv,
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().data).toMatchObject({ imported: 1 });

    const invalid = await injectAs(admin, {
      method: 'POST',
      url: '/api/v1/households/import',
      headers: { 'content-type': 'text/csv' },
      payload: [
        'code,address,rw,rt,block,occupancyStatus,ownershipStatus',
        'D-04,x,05,03,A,OCCUPIED,OWNER_OCCUPIED',
        'E-05,Jl. Harmoni Blok A No. 5,05,03,A,OCCUPIED,OWNER_OCCUPIED',
      ].join('\n'),
    });
    expect(invalid.statusCode).toBe(422);

    const notPartiallyImported = await database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM households
       WHERE organization_id = $1 AND code IN ('D-04', 'E-05')`,
      [demoIds.organization],
    );
    expect(notPartiallyImported.rows[0]?.total).toBe(0);

    const exported = await injectAs(admin, {
      method: 'GET',
      url: '/api/v1/households/export',
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.body).toContain(
      'code,address,rw,rt,block,occupancyStatus,ownershipStatus',
    );
    expect(exported.body).toContain('C-03');
    expect(exported.body).not.toContain('private_notes');
  });
});
