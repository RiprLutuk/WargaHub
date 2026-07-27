import type { FastifyInstance } from 'fastify';
import { organizationUpdateSchema } from '@wargahub/contracts';
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
}
