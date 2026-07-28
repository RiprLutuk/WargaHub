import {
  facilityCreateSchema,
  facilityReservationCreateSchema,
  guestCreateSchema,
  lostFoundCreateSchema,
  socialAidCreateSchema,
  umkmCreateSchema,
  vehicleCreateSchema,
} from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { AppError, success } from '../../lib/http.js';

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;

export async function extendedRoutes(app: FastifyInstance): Promise<void> {
  // --- 1. FASILITAS & PEMINJAMAN (PRD 12.14) ---
  app.get(
    '/facilities',
    { preHandler: app.requirePermission('facility.read') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        name: string;
        description: string;
        category: string;
        fee: string | number;
        deposit: string | number;
        requires_approval: boolean;
        active: boolean;
      }>(
        `SELECT id, name, description, category, fee, deposit, requires_approval, active
         FROM facilities WHERE organization_id = $1 ORDER BY name ASC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        category: f.category,
        fee: Number(f.fee),
        deposit: Number(f.deposit),
        requiresApproval: f.requires_approval,
        active: f.active,
      })));
    },
  );

  app.post(
    '/facilities',
    { preHandler: app.requirePermission('facility.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = facilityCreateSchema.parse(request.body);
      const facilityId = newId('fac');

      await app.database.query(
        `INSERT INTO facilities (id, organization_id, name, description, category, fee, deposit, requires_approval)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          facilityId,
          request.auth.organizationId,
          body.name,
          body.description,
          body.category,
          body.fee,
          body.deposit,
          body.requiresApproval,
        ],
      );

      return reply.status(201).send(success(request, { id: facilityId, name: body.name }));
    },
  );

  app.get(
    '/facilities/reservations',
    { preHandler: app.requirePermission('facility.reserve') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        facility_id: string;
        facility_name: string;
        household_id: string;
        purpose: string;
        starts_at: string;
        ends_at: string;
        status: string;
      }>(
        `SELECT fr.id, fr.facility_id, f.name AS facility_name, fr.household_id,
                fr.purpose, fr.starts_at, fr.ends_at, fr.status
         FROM facility_reservations fr
         JOIN facilities f ON f.id = fr.facility_id
         WHERE fr.organization_id = $1 AND fr.user_id = $2
         ORDER BY fr.starts_at DESC`,
        [request.auth.organizationId, request.auth.id],
      );
      return success(request, res.rows.map((row) => ({
        id: row.id,
        facilityId: row.facility_id,
        facilityName: row.facility_name,
        householdId: row.household_id,
        purpose: row.purpose,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
      })));
    },
  );

  app.post(
    '/facilities/reservations',
    { preHandler: app.requirePermission('facility.reserve') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = facilityReservationCreateSchema.parse(request.body);

      const facRes = await app.database.query<{ id: string; requires_approval: boolean }>(
        `SELECT id, requires_approval FROM facilities WHERE organization_id = $1 AND id = $2 AND active = true`,
        [request.auth.organizationId, body.facilityId],
      );
      const fac = facRes.rows[0];
      if (!fac) throw new AppError(404, 'FACILITY_NOT_FOUND', 'Fasilitas tidak ditemukan atau tidak aktif.');

      const resId = newId('fres');
      const initialStatus = fac.requires_approval ? 'PENDING' : 'APPROVED';

      await app.database.query(
        `INSERT INTO facility_reservations (id, organization_id, facility_id, user_id, household_id, purpose, starts_at, ends_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          resId,
          request.auth.organizationId,
          body.facilityId,
          request.auth.id,
          body.householdId,
          body.purpose,
          body.startsAt,
          body.endsAt,
          initialStatus,
        ],
      );

      return reply.status(201).send(success(request, { id: resId, status: initialStatus }));
    },
  );

  // --- 2. KENDARAAN & TAMU (PRD 12.15 & 12.16) ---
  app.get(
    '/vehicles',
    { preHandler: app.requirePermission('vehicle.manage') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        plate_number: string;
        type: string;
        brand_model: string;
        household_id: string;
      }>(
        `SELECT id, plate_number, type, brand_model, household_id
         FROM vehicles WHERE organization_id = $1 ORDER BY created_at DESC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((v) => ({
        id: v.id,
        plateNumber: v.plate_number,
        type: v.type,
        brandModel: v.brand_model,
        householdId: v.household_id,
      })));
    },
  );

  app.post(
    '/vehicles',
    { preHandler: app.requirePermission('vehicle.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = vehicleCreateSchema.parse(request.body);
      const vehicleId = newId('veh');

      await app.database.query(
        `INSERT INTO vehicles (id, organization_id, household_id, owner_id, plate_number, type, brand_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          vehicleId,
          request.auth.organizationId,
          body.householdId,
          request.auth.id,
          body.plateNumber.toUpperCase(),
          body.type,
          body.brandModel,
        ],
      );

      return reply.status(201).send(success(request, { id: vehicleId, plateNumber: body.plateNumber }));
    },
  );

  app.get(
    '/guests',
    { preHandler: app.requirePermission('guest.manage') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        guest_name: string;
        purpose: string;
        pass_code: string;
        expected_arrival: string;
        status: string;
      }>(
        `SELECT id, guest_name, purpose, pass_code, expected_arrival, status
         FROM guests WHERE organization_id = $1 AND registered_by = $2
         ORDER BY expected_arrival DESC`,
        [request.auth.organizationId, request.auth.id],
      );
      return success(request, res.rows.map((row) => ({
        id: row.id,
        name: row.guest_name,
        purpose: row.purpose,
        passCode: row.pass_code,
        expectedArrival: row.expected_arrival,
        status: row.status,
      })));
    },
  );

  app.post(
    '/guests',
    { preHandler: app.requirePermission('guest.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = guestCreateSchema.parse(request.body);
      const guestId = newId('gst');
      const passCode = `GST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await app.database.query(
        `INSERT INTO guests (id, organization_id, household_id, registered_by, guest_name, phone, purpose, pass_code, expected_arrival)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          guestId,
          request.auth.organizationId,
          body.householdId,
          request.auth.id,
          body.guestName,
          body.phone ?? null,
          body.purpose,
          passCode,
          body.expectedArrival,
        ],
      );

      return reply.status(201).send(success(request, { id: guestId, passCode, status: 'EXPECTED' }));
    },
  );

  // --- 3. UMKM & JASA WARGA (PRD 12.17) ---
  app.get(
    '/umkms',
    { preHandler: app.requirePermission('umkm.read') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        name: string;
        category: string;
        description: string;
        contact_phone: string;
        operating_hours: string;
        verified: boolean;
      }>(
        `SELECT id, name, category, description, contact_phone, operating_hours, verified
         FROM umkms WHERE organization_id = $1 AND active = true ORDER BY name ASC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((u) => ({
        id: u.id,
        name: u.name,
        category: u.category,
        description: u.description,
        contactPhone: u.contact_phone,
        operatingHours: u.operating_hours,
        verified: u.verified,
      })));
    },
  );

  app.post(
    '/umkms',
    { preHandler: app.requirePermission('umkm.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = umkmCreateSchema.parse(request.body);
      const umkmId = newId('umkm');

      await app.database.query(
        `INSERT INTO umkms (id, organization_id, owner_id, name, category, description, contact_phone, operating_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          umkmId,
          request.auth.organizationId,
          request.auth.id,
          body.name,
          body.category,
          body.description,
          body.contactPhone,
          body.operatingHours,
        ],
      );

      return reply.status(201).send(success(request, { id: umkmId, name: body.name, verified: false }));
    },
  );

  // --- 4. BANTUAN SOSIAL (PRD 12.18) ---
  app.get(
    '/social-aid',
    { preHandler: app.requirePermission('social_aid.manage') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        title: string;
        description: string;
        target_amount: string | number;
        collected_amount: string | number;
        status: string;
      }>(
        `SELECT id, title, description, target_amount, collected_amount, status
         FROM social_aid_programs WHERE organization_id = $1 ORDER BY created_at DESC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((sa) => ({
        id: sa.id,
        title: sa.title,
        description: sa.description,
        targetAmount: Number(sa.target_amount),
        collectedAmount: Number(sa.collected_amount),
        status: sa.status,
      })));
    },
  );

  app.post(
    '/social-aid',
    { preHandler: app.requirePermission('social_aid.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = socialAidCreateSchema.parse(request.body);
      const aidId = newId('said');

      await app.database.query(
        `INSERT INTO social_aid_programs (id, organization_id, title, description, target_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [aidId, request.auth.organizationId, body.title, body.description, body.targetAmount],
      );

      return reply.status(201).send(success(request, { id: aidId, title: body.title, status: 'OPEN' }));
    },
  );

  // --- 5. KEHILANGAN & PENEMUAN (PRD 12.19) ---
  app.get(
    '/lost-found',
    { preHandler: app.requirePermission('lost_found.read') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        kind: string;
        title: string;
        description: string;
        location: string;
        status: string;
        created_at: string;
      }>(
        `SELECT id, kind, title, description, location, status, created_at
         FROM lost_found_items WHERE organization_id = $1 ORDER BY created_at DESC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((lf) => ({
        id: lf.id,
        kind: lf.kind,
        title: lf.title,
        description: lf.description,
        location: lf.location,
        status: lf.status,
        createdAt: lf.created_at,
      })));
    },
  );

  app.post(
    '/lost-found',
    { preHandler: app.requirePermission('lost_found.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = lostFoundCreateSchema.parse(request.body);
      const lfId = newId('lf');

      await app.database.query(
        `INSERT INTO lost_found_items (id, organization_id, reporter_id, kind, title, description, location, photo_file_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          lfId,
          request.auth.organizationId,
          request.auth.id,
          body.kind,
          body.title,
          body.description,
          body.location,
          body.photoFileId ?? null,
        ],
      );

      return reply.status(201).send(success(request, { id: lfId, title: body.title, status: 'OPEN' }));
    },
  );
}
