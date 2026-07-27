import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { z } from 'zod';
import {
  householdCreateSchema,
  idSchema,
  pageQuerySchema,
  residentCreateSchema,
} from '@wargahub/contracts';
import type { Database } from '../../db/client.js';
import { digestToken, hashPassword, randomToken } from '../../lib/auth.js';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type HouseholdInput = z.infer<typeof householdCreateSchema>;

type HouseholdRow = {
  id: string;
  code: string;
  address: string;
  occupancy_status: 'OCCUPIED' | 'EMPTY';
  ownership_status: 'OWNER_OCCUPIED' | 'RENTED' | 'OTHER';
  rw_code: string;
  rw_name: string;
  rt_code: string;
  rt_name: string;
  block_code: string | null;
  block_name: string | null;
};

type ResidentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'INVITED' | 'ACTIVE' | 'INACTIVE';
  communication_preference: string;
  participation_preferences: string[];
  household_id: string;
  household_code: string;
  relationship: string;
  can_manage: boolean;
  started_at: string;
  ended_at: string | null;
};

const idParamsSchema = z.object({ id: idSchema });
const householdUpdateSchema = z.object({
  address: z.string().trim().min(5).max(300).optional(),
  occupancyStatus: z.enum(['OCCUPIED', 'EMPTY']).optional(),
  ownershipStatus: z.enum(['OWNER_OCCUPIED', 'RENTED', 'OTHER']).optional(),
  block: z.string().trim().max(30).nullable().optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Tidak ada perubahan yang dikirim.',
});
const csvHeaders = [
  'code',
  'address',
  'rw',
  'rt',
  'block',
  'occupancyStatus',
  'ownershipStatus',
] as const;

function normalizeHouseholdCode(code: string): string {
  return code.toLocaleUpperCase('id-ID');
}

function householdProjection(row: HouseholdRow) {
  return {
    id: row.id,
    code: row.code,
    address: row.address,
    rw: { code: row.rw_code, name: row.rw_name },
    rt: { code: row.rt_code, name: row.rt_name },
    block: row.block_code
      ? { code: row.block_code, name: row.block_name }
      : null,
    occupancyStatus: row.occupancy_status,
    ownershipStatus: row.ownership_status,
  };
}

function residentProjection(row: ResidentRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email.endsWith('@wargahub.invalid') ? null : row.email,
    phone: row.phone,
    status: row.status,
    communicationPreference: row.communication_preference,
    participationPreferences: row.participation_preferences,
    householdId: row.household_id,
    householdCode: row.household_code,
    relationship: row.relationship,
    canManage: row.can_manage,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

async function findHousehold(
  database: Database,
  organizationId: string,
  householdId: string,
): Promise<HouseholdRow | undefined> {
  const result = await database.query<HouseholdRow>(
    `SELECT h.id, h.code, h.address, h.occupancy_status, h.ownership_status,
            rw.code AS rw_code, rw.name AS rw_name,
            rt.code AS rt_code, rt.name AS rt_name,
            b.code AS block_code, b.name AS block_name
     FROM households h
     JOIN rts rt ON rt.id = h.rt_id AND rt.organization_id = h.organization_id
     JOIN rws rw ON rw.id = rt.rw_id AND rw.organization_id = h.organization_id
     LEFT JOIN blocks b ON b.id = h.block_id AND b.organization_id = h.organization_id
     WHERE h.organization_id = $1 AND h.id = $2`,
    [organizationId, householdId],
  );
  return result.rows[0];
}

async function resolveArea(
  database: Database,
  organizationId: string,
  input: Pick<HouseholdInput, 'rw' | 'rt' | 'block'>,
): Promise<{ rtId: string; blockId: string | null }> {
  const rtResult = await database.query<{ id: string }>(
    `SELECT rt.id
     FROM rts rt
     JOIN rws rw ON rw.id = rt.rw_id AND rw.organization_id = rt.organization_id
     WHERE rt.organization_id = $1 AND rw.code = $2 AND rt.code = $3`,
    [organizationId, input.rw, input.rt],
  );
  const rt = rtResult.rows[0];
  if (!rt) {
    throw new AppError(
      422,
      'INVALID_AREA',
      `RW ${input.rw} / RT ${input.rt} tidak terdaftar.`,
    );
  }
  if (!input.block) return { rtId: rt.id, blockId: null };

  const blockResult = await database.query<{ id: string }>(
    `SELECT id FROM blocks
     WHERE organization_id = $1 AND rt_id = $2 AND code = $3`,
    [organizationId, rt.id, input.block],
  );
  const block = blockResult.rows[0];
  if (!block) {
    throw new AppError(
      422,
      'INVALID_AREA',
      `Blok ${input.block} tidak terdaftar pada RT tersebut.`,
    );
  }
  return { rtId: rt.id, blockId: block.id };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) throw new AppError(422, 'INVALID_CSV', 'Tanda kutip CSV tidak lengkap.');
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function validatedCsvRows(body: unknown): HouseholdInput[] {
  if (typeof body !== 'string' || body.trim().length === 0) {
    throw new AppError(422, 'INVALID_CSV', 'Berkas CSV kosong.');
  }
  const records = parseCsv(body);
  const header = records.shift();
  if (header) header[0] = header[0]?.replace(/^\uFEFF/, '') ?? '';
  if (!header || header.length !== csvHeaders.length ||
      !csvHeaders.every((value, index) => header[index]?.trim() === value)) {
    throw new AppError(422, 'INVALID_CSV_HEADER', 'Kolom CSV tidak sesuai template.');
  }
  if (records.length === 0) {
    throw new AppError(422, 'INVALID_CSV', 'CSV tidak memiliki baris data.');
  }

  const inputs = records.map((values, index) => {
    if (values.length !== csvHeaders.length) {
      throw new AppError(
        422,
        'INVALID_CSV_ROW',
        `Jumlah kolom pada baris ${index + 2} tidak sesuai.`,
      );
    }
    const candidate = {
      code: values[0]?.trim(),
      address: values[1]?.trim(),
      rw: values[2]?.trim(),
      rt: values[3]?.trim(),
      ...(values[4]?.trim() ? { block: values[4]!.trim() } : {}),
      occupancyStatus: values[5]?.trim(),
      ownershipStatus: values[6]?.trim(),
    };
    const parsed = householdCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new AppError(
        422,
        'INVALID_CSV_ROW',
        `Data pada baris ${index + 2} belum valid.`,
        { line: index + 2, fields: parsed.error.flatten().fieldErrors },
      );
    }
    return { ...parsed.data, code: normalizeHouseholdCode(parsed.data.code) };
  });

  const codes = new Set<string>();
  for (const input of inputs) {
    const normalized = input.code.toLocaleLowerCase('id-ID');
    if (codes.has(normalized)) {
      throw new AppError(422, 'DUPLICATE_CSV_CODE', `Kode rumah ${input.code} berulang.`);
    }
    codes.add(normalized);
  }
  return inputs;
}

function csvCell(value: string): string {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

export async function householdRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(
    ['text/csv', 'application/csv'],
    { parseAs: 'string' },
    (_request, body, done) => done(null, body),
  );

  app.get('/households/export', {
    preHandler: app.requirePermission('resident.export'),
  }, async (request, reply) => {
    const result = await app.database.query<{
      code: string;
      address: string;
      rw: string;
      rt: string;
      block: string | null;
      occupancy_status: string;
      ownership_status: string;
    }>(
      `SELECT h.code, h.address, rw.code AS rw, rt.code AS rt, b.code AS block,
              h.occupancy_status, h.ownership_status
       FROM households h
       JOIN rts rt ON rt.id = h.rt_id AND rt.organization_id = h.organization_id
       JOIN rws rw ON rw.id = rt.rw_id AND rw.organization_id = h.organization_id
       LEFT JOIN blocks b ON b.id = h.block_id AND b.organization_id = h.organization_id
       WHERE h.organization_id = $1
       ORDER BY h.code`,
      [request.auth!.organizationId],
    );
    const lines = [csvHeaders.join(',')];
    for (const row of result.rows) {
      lines.push([
        row.code,
        row.address,
        row.rw,
        row.rt,
        row.block ?? '',
        row.occupancy_status,
        row.ownership_status,
      ].map(csvCell).join(','));
    }
    await recordAudit(app.database, {
      organizationId: request.auth!.organizationId,
      actorId: request.auth!.id,
      action: 'household.export',
      entityType: 'household',
      requestId: request.id,
      ipAddress: request.ip,
      after: { rowCount: result.rows.length },
    });
    return reply
      .type('text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="households.csv"')
      .send(`${lines.join('\r\n')}\r\n`);
  });

  app.post('/households/import', {
    preHandler: app.requirePermission('resident.create'),
  }, async (request, reply) => {
    app.requireCsrf(request);
    const inputs = validatedCsvRows(request.body);
    const organizationId = request.auth!.organizationId;
    const existing = await app.database.query<{ code: string }>(
      `SELECT code FROM households
       WHERE organization_id = $1 AND lower(code) = ANY($2::text[])`,
      [organizationId, inputs.map((input) => input.code.toLowerCase())],
    );
    if (existing.rows[0]) {
      throw new AppError(
        409,
        'HOUSEHOLD_CODE_EXISTS',
        `Kode rumah ${existing.rows[0].code} sudah digunakan.`,
      );
    }

    const createdIds = await app.database.transaction(async (transaction) => {
      const ids: string[] = [];
      for (const input of inputs) {
        const area = await resolveArea(transaction, organizationId, input);
        const id = ulid();
        await transaction.query(
          `INSERT INTO households
            (id, organization_id, rt_id, block_id, code, address,
             occupancy_status, ownership_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            organizationId,
            area.rtId,
            area.blockId,
            input.code,
            input.address,
            input.occupancyStatus,
            input.ownershipStatus,
          ],
        );
        ids.push(id);
      }
      return ids;
    });
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'household.import',
      entityType: 'household',
      requestId: request.id,
      ipAddress: request.ip,
      after: { imported: createdIds.length, ids: createdIds },
    });
    return reply.status(201).send(success(request, { imported: createdIds.length, ids: createdIds }));
  });

  app.get('/households', { preHandler: app.authenticate }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organizationId = request.auth!.organizationId;
    const canReadAll = request.auth!.permissions.includes('resident.read');
    if (!canReadAll && request.auth!.householdIds.length === 0) {
      return success(request, [], { page: query.page, pageSize: query.pageSize, total: 0 });
    }

    const params: unknown[] = [organizationId];
    const conditions = ['h.organization_id = $1'];
    if (!canReadAll) {
      const placeholders = request.auth!.householdIds.map((id) => {
        params.push(id);
        return `$${params.length}`;
      });
      conditions.push(`h.id IN (${placeholders.join(', ')})`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      const placeholder = `$${params.length}`;
      conditions.push(`(h.code ILIKE ${placeholder} OR h.address ILIKE ${placeholder})`);
    }
    const where = conditions.join(' AND ');
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM households h WHERE ${where}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await app.database.query<HouseholdRow>(
      `SELECT h.id, h.code, h.address, h.occupancy_status, h.ownership_status,
              rw.code AS rw_code, rw.name AS rw_name,
              rt.code AS rt_code, rt.name AS rt_name,
              b.code AS block_code, b.name AS block_name
       FROM households h
       JOIN rts rt ON rt.id = h.rt_id AND rt.organization_id = h.organization_id
       JOIN rws rw ON rw.id = rt.rw_id AND rw.organization_id = h.organization_id
       LEFT JOIN blocks b ON b.id = h.block_id AND b.organization_id = h.organization_id
       WHERE ${where}
       ORDER BY h.code
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, rows.rows.map(householdProjection), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.post('/households', {
    preHandler: app.requirePermission('resident.create'),
  }, async (request, reply) => {
    app.requireCsrf(request);
    const input = householdCreateSchema.parse(request.body);
    const code = normalizeHouseholdCode(input.code);
    const organizationId = request.auth!.organizationId;
    const duplicate = await app.database.query<{ id: string }>(
      `SELECT id FROM households WHERE organization_id = $1 AND lower(code) = lower($2)`,
      [organizationId, code],
    );
    if (duplicate.rows[0]) {
      throw new AppError(409, 'HOUSEHOLD_CODE_EXISTS', 'Kode rumah sudah digunakan.');
    }
    const area = await resolveArea(app.database, organizationId, input);
    const id = ulid();
    await app.database.query(
      `INSERT INTO households
        (id, organization_id, rt_id, block_id, code, address,
         occupancy_status, ownership_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        organizationId,
        area.rtId,
        area.blockId,
        code,
        input.address,
        input.occupancyStatus,
        input.ownershipStatus,
      ],
    );
    const row = await findHousehold(app.database, organizationId, id);
    if (!row) throw new AppError(500, 'HOUSEHOLD_CREATE_FAILED', 'Rumah gagal disimpan.');
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'household.create',
      entityType: 'household',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      after: householdProjection(row),
    });
    return reply.status(201).send(success(request, householdProjection(row)));
  });

  app.patch('/households/:id', {
    preHandler: app.requirePermission('resident.update'),
  }, async (request) => {
    app.requireCsrf(request);
    const { id } = idParamsSchema.parse(request.params);
    const input = householdUpdateSchema.parse(request.body);
    const organizationId = request.auth!.organizationId;
    const before = await findHousehold(app.database, organizationId, id);
    if (!before) throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    const currentArea = await app.database.query<{ rt_id: string; block_id: string | null }>(
      `SELECT rt_id, block_id FROM households
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, id],
    );
    let blockId = currentArea.rows[0]?.block_id ?? null;
    if (input.block !== undefined) {
      if (input.block === null || input.block === '') {
        blockId = null;
      } else {
        const block = await app.database.query<{ id: string }>(
          `SELECT id FROM blocks
           WHERE organization_id = $1 AND rt_id = $2 AND code = $3`,
          [organizationId, currentArea.rows[0]!.rt_id, input.block],
        );
        if (!block.rows[0]) {
          throw new AppError(422, 'INVALID_AREA', 'Blok tidak terdaftar pada RT tersebut.');
        }
        blockId = block.rows[0].id;
      }
    }
    await app.database.query(
      `UPDATE households
       SET address = $1, occupancy_status = $2, ownership_status = $3,
           block_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $5 AND id = $6`,
      [
        input.address ?? before.address,
        input.occupancyStatus ?? before.occupancy_status,
        input.ownershipStatus ?? before.ownership_status,
        blockId,
        organizationId,
        id,
      ],
    );
    const row = await findHousehold(app.database, organizationId, id);
    if (!row) throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'household.update',
      entityType: 'household',
      entityId: id,
      requestId: request.id,
      ipAddress: request.ip,
      before: householdProjection(before),
      after: householdProjection(row),
    });
    return success(request, householdProjection(row));
  });

  app.get('/households/:id', { preHandler: app.authenticate }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const canReadAll = request.auth!.permissions.includes('resident.read');
    if (!canReadAll && !request.auth!.householdIds.includes(id)) {
      throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    }
    const row = await findHousehold(app.database, request.auth!.organizationId, id);
    if (!row) throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    return success(request, householdProjection(row));
  });

  app.get('/households/:id/members', { preHandler: app.authenticate }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const canReadAll = request.auth!.permissions.includes('resident.read');
    if (!canReadAll && !request.auth!.householdIds.includes(id)) {
      throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    }
    const household = await findHousehold(app.database, request.auth!.organizationId, id);
    if (!household) throw new AppError(404, 'HOUSEHOLD_NOT_FOUND', 'Rumah tidak ditemukan.');
    const result = await app.database.query<ResidentRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.communication_preference,
              u.participation_preferences, hm.household_id, h.code AS household_code,
              hm.relationship, hm.can_manage, hm.started_at, hm.ended_at
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id AND u.organization_id = hm.organization_id
       JOIN households h ON h.id = hm.household_id AND h.organization_id = hm.organization_id
       WHERE hm.organization_id = $1 AND hm.household_id = $2 AND hm.ended_at IS NULL
       ORDER BY u.name`,
      [request.auth!.organizationId, id],
    );
    return success(request, result.rows.map(residentProjection));
  });

  app.get('/residents', {
    preHandler: app.requirePermission('resident.read'),
  }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const params: unknown[] = [request.auth!.organizationId];
    let filter = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      filter = ` AND (u.name ILIKE $2 OR u.email ILIKE $2 OR
                       coalesce(u.phone, '') ILIKE $2 OR h.code ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id AND u.organization_id = hm.organization_id
       JOIN households h ON h.id = hm.household_id AND h.organization_id = hm.organization_id
       WHERE hm.organization_id = $1 AND hm.ended_at IS NULL${filter}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<ResidentRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.communication_preference,
              u.participation_preferences, hm.household_id, h.code AS household_code,
              hm.relationship, hm.can_manage, hm.started_at, hm.ended_at
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id AND u.organization_id = hm.organization_id
       JOIN households h ON h.id = hm.household_id AND h.organization_id = hm.organization_id
       WHERE hm.organization_id = $1 AND hm.ended_at IS NULL${filter}
       ORDER BY u.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map(residentProjection), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.post('/residents', {
    preHandler: app.requirePermission('resident.create'),
  }, async (request, reply) => {
    app.requireCsrf(request);
    const input = residentCreateSchema.parse(request.body);
    const organizationId = request.auth!.organizationId;
    const household = await findHousehold(app.database, organizationId, input.householdId);
    if (!household) throw new AppError(422, 'INVALID_HOUSEHOLD', 'Rumah tidak ditemukan.');
    if (input.email) {
      const duplicate = await app.database.query<{ id: string }>(
        `SELECT id FROM users WHERE organization_id = $1 AND lower(email) = lower($2)`,
        [organizationId, input.email],
      );
      if (duplicate.rows[0]) {
        throw new AppError(409, 'RESIDENT_EMAIL_EXISTS', 'Email sudah terdaftar.');
      }
    }

    const userId = ulid();
    const membershipId = ulid();
    const email = input.email ?? `pending+${userId.toLowerCase()}@wargahub.invalid`;
    const passwordHash = await hashPassword(randomToken());
    const residentRole = await app.database.query<{ id: string }>(
      `SELECT id FROM roles
       WHERE organization_id = $1 AND code = 'RESIDENT'`,
      [organizationId],
    );
    if (!residentRole.rows[0]) {
      throw new AppError(409, 'RESIDENT_ROLE_REQUIRED', 'Role warga belum tersedia.');
    }
    const invitationToken = input.email ? randomToken() : undefined;
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await app.database.transaction(async (transaction) => {
      await transaction.query(
        `INSERT INTO users
          (id, organization_id, email, phone, password_hash, name, status,
           participation_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, 'INVITED', $7::jsonb)`,
        [
          userId,
          organizationId,
          email,
          input.phone ?? null,
          passwordHash,
          input.name,
          JSON.stringify(input.participationPreferences),
        ],
      );
      await transaction.query(
        `INSERT INTO household_members
          (id, organization_id, household_id, user_id, relationship, can_manage)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          membershipId,
          organizationId,
          input.householdId,
          userId,
          input.relationship,
          input.relationship === 'HEAD',
        ],
      );
      await transaction.query(
        `INSERT INTO user_roles
          (id, organization_id, user_id, role_id, scope_type, scope_id)
         VALUES ($1, $2, $3, $4, 'ORGANIZATION', $2)`,
        [ulid(), organizationId, userId, residentRole.rows[0]!.id],
      );
      if (input.email && invitationToken) {
        await transaction.query(
          `INSERT INTO password_reset_tokens
            (id, organization_id, user_id, token_digest, expires_at, purpose)
           VALUES ($1, $2, $3, $4, $5, 'INVITATION')`,
          [
            ulid(),
            organizationId,
            userId,
            digestToken(invitationToken),
            invitationExpiry.toISOString(),
          ],
        );
        const invitationUrl = `${app.config.PUBLIC_BASE_URL}/accept-invitation#token=${encodeURIComponent(invitationToken)}`;
        await transaction.query(
          `INSERT INTO jobs (id, organization_id, kind, payload)
           VALUES ($1, $2, 'SEND_EMAIL', $3::jsonb)`,
          [
            ulid(),
            organizationId,
            JSON.stringify({
              to: input.email,
              subject: 'Aktifkan akun WargaHub',
              text: `Aktifkan akun WargaHub Anda dalam 7 hari: ${invitationUrl}`,
            }),
          ],
        );
      }
    });
    const created = await app.database.query<ResidentRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.communication_preference,
              u.participation_preferences, hm.household_id, h.code AS household_code,
              hm.relationship, hm.can_manage, hm.started_at, hm.ended_at
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id AND u.organization_id = hm.organization_id
       JOIN households h ON h.id = hm.household_id AND h.organization_id = hm.organization_id
       WHERE hm.organization_id = $1 AND hm.id = $2`,
      [organizationId, membershipId],
    );
    const row = created.rows[0];
    if (!row) throw new AppError(500, 'RESIDENT_CREATE_FAILED', 'Warga gagal disimpan.');
    await recordAudit(app.database, {
      organizationId,
      actorId: request.auth!.id,
      action: 'resident.create',
      entityType: 'resident',
      entityId: userId,
      requestId: request.id,
      ipAddress: request.ip,
      after: residentProjection(row),
    });
    return reply.status(201).send(success(request, residentProjection(row)));
  });
}
