import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

const modulesSchema = z.object({
  billing: z.boolean(),
  finance: z.boolean(),
  patrol: z.boolean(),
  complaints: z.boolean(),
  activities: z.boolean(),
  documents: z.boolean(),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/settings/modules', { preHandler: app.authenticate }, async (request) => {
    const result = await app.database.query<{ modules: unknown }>(
      'SELECT modules FROM organizations WHERE id = $1',
      [request.auth?.organizationId],
    );
    return success(request, modulesSchema.parse(result.rows[0]?.modules));
  });

  app.put(
    '/settings/modules',
    { preHandler: app.requirePermission('settings.manage') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const modules = modulesSchema.parse(request.body);
      const current = await app.database.query<{ modules: unknown }>(
        'SELECT modules FROM organizations WHERE id = $1',
        [request.auth.organizationId],
      );
      await app.database.query(
        `UPDATE organizations SET modules = $1::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(modules), request.auth.organizationId],
      );
      await recordAudit(app.database, {
        organizationId: request.auth.organizationId,
        actorId: request.auth.id,
        action: 'settings.modules.update',
        entityType: 'organization',
        entityId: request.auth.organizationId,
        requestId: request.id,
        before: current.rows[0]?.modules,
        after: modules,
      });
      return success(request, modules);
    },
  );
}
