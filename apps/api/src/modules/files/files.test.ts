import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { createDatabase, type Database } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { demoIds, seedDemoData } from '../../seed.js';

function multipartBody(
  boundary: string,
  filename: string,
  mime: string,
  bytes: Uint8Array,
): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}

describe('private file uploads', () => {
  let database: Database;
  let app: FastifyInstance;
  let uploadDirectory: string;

  beforeEach(async () => {
    uploadDirectory = await mkdtemp(join(tmpdir(), 'wargahub-files-'));
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    app = await buildApp({
      database,
      logger: false,
      config: loadConfig({ NODE_ENV: 'test', UPLOAD_DIR: uploadDirectory }),
    });
  });

  afterEach(async () => {
    await app.close();
    await database.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  });

  async function login(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'WargaHub123!' },
    });
    const setCookie = response.headers['set-cookie'];
    return {
      cookie: (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0] ?? '',
      csrf: response.json().data.csrfToken as string,
    };
  }

  it('rejects a file whose content type is not allowed', async () => {
    const auth = await login('warga@demo.wargahub.id');
    const boundary = '----wargahub-invalid';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: {
        cookie: auth.cookie,
        'x-csrf-token': auth.csrf,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'catatan.txt', 'text/plain', new TextEncoder().encode('rahasia')),
    });
    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('stores an allowed upload privately and blocks another resident', async () => {
    const owner = await login('warga@demo.wargahub.id');
    const other = await login('warga2@demo.wargahub.id');
    const admin = await login('admin@demo.wargahub.id');
    const treasurer = await login('bendahara@demo.wargahub.id');
    const boundary = '----wargahub-png';
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: {
        cookie: owner.cookie,
        'x-csrf-token': owner.csrf,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'bukti.png', 'image/png', png),
    });
    expect(uploaded.statusCode).toBe(201);
    expect(uploaded.json().data).toMatchObject({
      originalName: 'bukti.png',
      mimeType: 'image/png',
      visibility: 'PRIVATE',
    });

    const denied = await app.inject({
      method: 'GET',
      url: `/api/v1/files/${uploaded.json().data.id}`,
      headers: { cookie: other.cookie },
    });
    const unrelatedManager = await app.inject({
      method: 'GET',
      url: `/api/v1/files/${uploaded.json().data.id}`,
      headers: { cookie: admin.cookie },
    });
    const stolenDocument = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      headers: { cookie: admin.cookie, 'x-csrf-token': admin.csrf },
      payload: {
        title: 'Dokumen dari file warga',
        description: 'File privat warga tidak boleh menjadi dokumen pengurus.',
        category: 'Pengujian',
        visibility: 'PUBLIC',
        fileId: uploaded.json().data.id,
      },
    });
    const bill = await app.inject({
      method: 'POST',
      url: '/api/v1/bills',
      headers: { cookie: admin.cookie, 'x-csrf-token': admin.csrf },
      payload: {
        householdId: demoIds.householdA,
        title: 'Iuran file privat',
        description: 'Pengujian akses bukti pembayaran yang terikat.',
        period: '2026-09',
        dueAt: '2026-09-30T16:59:59.000Z',
        amount: 25_000,
        kind: 'MANDATORY',
        recurrence: 'ONE_TIME',
      },
    });
    const payment = await app.inject({
      method: 'POST',
      url: `/api/v1/bills/${bill.json().data.id}/payments`,
      headers: {
        cookie: owner.cookie,
        'x-csrf-token': owner.csrf,
        'idempotency-key': 'bound-private-proof-file',
      },
      payload: {
        amount: 25_000,
        method: 'BANK_TRANSFER',
        proofFileId: uploaded.json().data.id,
      },
    });
    const reconciler = await app.inject({
      method: 'GET',
      url: `/api/v1/files/${uploaded.json().data.id}`,
      headers: { cookie: treasurer.cookie },
    });
    const paymentQueue = await app.inject({
      method: 'GET',
      url: '/api/v1/payments',
      headers: { cookie: treasurer.cookie },
    });
    const downloaded = await app.inject({
      method: 'GET',
      url: `/api/v1/files/${uploaded.json().data.id}`,
      headers: { cookie: owner.cookie },
    });
    expect(denied.statusCode).toBe(404);
    expect(unrelatedManager.statusCode).toBe(404);
    expect(stolenDocument.statusCode).toBe(422);
    expect(stolenDocument.json().error.code).toBe('INVALID_FILE');
    expect(payment.statusCode).toBe(201);
    expect(reconciler.statusCode).toBe(200);
    expect(paymentQueue.json().data[0]).toMatchObject({
      id: payment.json().data.id,
      proofFileId: uploaded.json().data.id,
    });
    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.rawPayload.subarray(0, 8)).toEqual(Buffer.from(png).subarray(0, 8));
  });
});
