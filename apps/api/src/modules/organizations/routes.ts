import type { FastifyInstance } from 'fastify';
import { idSchema, organizationUpdateSchema } from '@wargahub/contracts';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

type OrganizationRow = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  description: string;
  address: string;
  emergency_phone: string;
  timezone: string;
  locale: string;
  currency: string;
  modules: Record<string, boolean>;
};

const officerSchema = z.object({
  name: z.string().min(2, 'Nama pengurus minimal 2 karakter'),
  position: z.string().min(2, 'Jabatan pengurus minimal 2 karakter'),
  department: z.string().default('PENGURUS_INTI'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  period: z.string().default('2024 - 2027'),
  orderIndex: z.number().int().default(0),
});

const officerIdParams = z.object({ id: idSchema });

function organizationProjection(row: OrganizationRow) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    emergencyPhone: row.emergency_phone,
    timezone: row.timezone,
    locale: row.locale,
    currency: row.currency,
    modules: row.modules,
  };
}

async function findOrganization(app: FastifyInstance, organizationId: string) {
  const result = await app.database.query<OrganizationRow>(
    `SELECT id, name, short_name, slug, description, address, emergency_phone,
            timezone, locale, currency, modules
     FROM organizations WHERE id = $1`,
    [organizationId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Lingkungan tidak ditemukan.');
  return row;
}

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/organization',
    { preHandler: app.requirePermission('organization.read') },
    async (request) => {
      const row = await findOrganization(app, request.auth!.organizationId);
      return success(request, organizationProjection(row));
    },
  );

  app.patch(
    '/organization',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      app.requireCsrf(request);
      const input = organizationUpdateSchema.parse(request.body);
      const before = await findOrganization(app, request.auth!.organizationId);
      const updated = await app.database.query<OrganizationRow>(
        `UPDATE organizations
         SET name = $1, short_name = $2, description = $3, address = $4,
             emergency_phone = $5, timezone = $6, locale = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING id, name, short_name, slug, description, address, emergency_phone,
                   timezone, locale, currency, modules`,
        [
          input.name,
          input.shortName,
          input.description,
          input.address,
          input.emergencyPhone,
          input.timezone,
          input.locale,
          request.auth!.organizationId,
        ],
      );
      const row = updated.rows[0];
      if (!row) throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Lingkungan tidak ditemukan.');
      await recordAudit(app.database, {
        organizationId: request.auth!.organizationId,
        actorId: request.auth!.id,
        action: 'organization.update',
        entityType: 'organization',
        entityId: row.id,
        requestId: request.id,
        ipAddress: request.ip,
        ...(request.headers['user-agent']
          ? { userAgent: request.headers['user-agent'] }
          : {}),
        before: organizationProjection(before),
        after: organizationProjection(row),
      });
      return success(request, organizationProjection(row));
    },
  );

  // --- Organization Officers CRUD ---
  app.get(
    '/organization/officers',
    { preHandler: app.requirePermission('organization.read') },
    async (request) => {
      const result = await app.database.query<{
        id: string;
        name: string;
        position: string;
        department: string;
        phone: string | null;
        email: string | null;
        avatar_url: string | null;
        period: string;
        order_index: number;
        active: boolean;
      }>(
        `SELECT id, name, position, department, phone, email, avatar_url, period, order_index, active
         FROM organization_officers WHERE organization_id = $1 ORDER BY order_index ASC, created_at ASC`,
        [request.auth!.organizationId],
      );

      return success(request, result.rows.map((o) => ({
        id: o.id,
        name: o.name,
        position: o.position,
        department: o.department,
        phone: o.phone,
        email: o.email,
        avatarUrl: o.avatar_url,
        period: o.period,
        orderIndex: o.order_index,
        active: o.active,
      })));
    },
  );

  app.post(
    '/organization/officers',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      app.requireCsrf(request);
      const body = officerSchema.parse(request.body);
      const id = `officer_${crypto.randomUUID()}`;

      await app.database.query(
        `INSERT INTO organization_officers
         (id, organization_id, name, position, department, phone, email, period, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          request.auth!.organizationId,
          body.name,
          body.position,
          body.department,
          body.phone || null,
          body.email || null,
          body.period,
          body.orderIndex,
        ],
      );

      return success(request, { id, ...body });
    },
  );

  app.delete(
    '/organization/officers/:id',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      app.requireCsrf(request);
      const params = officerIdParams.parse(request.params);
      await app.database.query(
        `DELETE FROM organization_officers WHERE id = $1 AND organization_id = $2`,
        [params.id, request.auth!.organizationId],
      );
      return success(request, { id: params.id, deleted: true });
    },
  );
}
