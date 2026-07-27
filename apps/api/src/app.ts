import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import type { Permission } from '@wargahub/contracts';
import { loadConfig, type AppConfig } from './config.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { digestToken, safeUserById } from './lib/auth.js';
import { AppError, sendError, success } from './lib/http.js';
import { openApiDocument, openApiTransform } from './lib/openapi.js';
import { hasPermission } from './lib/policy.js';
import { authRoutes, sessionCookieName } from './modules/auth/routes.js';
import { activityRoutes } from './modules/activities/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { billingRoutes } from './modules/billing/routes.js';
import { complaintRoutes } from './modules/complaints/routes.js';
import { contentRoutes } from './modules/content/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { financeRoutes } from './modules/finance/routes.js';
import { fileRoutes } from './modules/files/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { patrolRoutes } from './modules/patrols/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { governanceRoutes } from './modules/governance/routes.js';
import { extendedRoutes } from './modules/extended/routes.js';

type BuildAppOptions = {
  database?: Database;
  config?: AppConfig;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const database = options.database ??
    (await createDatabase({
      ...(config.DATABASE_URL ? { databaseUrl: config.DATABASE_URL } : {}),
      dataDir: config.PGLITE_DATA_DIR,
    }));
  if (!options.database) await runMigrations(database);

  const app = Fastify({
    logger: options.logger ?? config.NODE_ENV !== 'test',
    trustProxy: true,
    genReqId: (request) => {
      const incoming = request.headers['x-request-id'];
      return typeof incoming === 'string' && incoming.length <= 100
        ? incoming
        : crypto.randomUUID();
    },
  });
  app.decorate('database', database);
  app.decorate('config', config);
  if (!options.database) {
    app.addHook('onClose', async () => database.close());
  }

  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true,
    allowedHeaders: ['content-type', 'x-csrf-token', 'x-request-id', 'idempotency-key'],
  });
  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, {
    limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
  });
  await app.register(swagger, {
    stripBasePath: false,
    openapi: openApiDocument,
    transform: openApiTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/documentation' });

  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest): Promise<void> {
      const token = request.cookies[sessionCookieName];
      if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.');
      const sessions = await database.query<{
        id: string;
        user_id: string;
        csrf_token: string;
      }>(
        `SELECT id, user_id, csrf_token FROM sessions
         WHERE token_digest = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        [digestToken(token)],
      );
      const session = sessions.rows[0];
      if (!session) throw new AppError(401, 'SESSION_EXPIRED', 'Sesi telah berakhir. Silakan masuk kembali.');
      const user = await safeUserById(database, session.user_id);
      if (!user) throw new AppError(401, 'SESSION_EXPIRED', 'Sesi tidak lagi berlaku.');
      request.auth = { ...user, sessionId: session.id, csrfToken: session.csrf_token };
      await database.query(
        'UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1',
        [session.id],
      );
    },
  );

  app.decorate('requireCsrf', function requireCsrf(request: FastifyRequest): void {
    if (!request.auth || request.headers['x-csrf-token'] !== request.auth.csrfToken) {
      throw new AppError(403, 'INVALID_CSRF_TOKEN', 'Permintaan tidak dapat diverifikasi. Muat ulang halaman.');
    }
  });

  app.decorate(
    'requirePermission',
    function requirePermission(permission: Permission) {
      return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        await app.authenticate(request, _reply);
        if (!request.auth || !hasPermission(request.auth.permissions, permission)) {
          throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.');
        }
      };
    },
  );

  app.get('/health', async (request) =>
    success(request, { status: 'ok', service: 'wargahub-api' }),
  );
  app.get('/ready', async (request) => {
    await database.query('SELECT 1');
    return success(request, { status: 'ready' });
  });

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Halaman atau data tidak ditemukan.', details: null },
      meta: { requestId: request.id },
    });
  });
  app.setErrorHandler((error, request, reply) => sendError(request, reply, error));

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(billingRoutes, { prefix: '/api/v1' });
  await app.register(financeRoutes, { prefix: '/api/v1' });
  await app.register(fileRoutes, { prefix: '/api/v1' });
  await app.register(complaintRoutes, { prefix: '/api/v1' });
  await app.register(activityRoutes, { prefix: '/api/v1' });
  await app.register(patrolRoutes, { prefix: '/api/v1' });
  await app.register(notificationRoutes, { prefix: '/api/v1' });
  await app.register(contentRoutes, { prefix: '/api/v1' });
  await app.register(dashboardRoutes, { prefix: '/api/v1' });
  await app.register(auditRoutes, { prefix: '/api/v1' });
  await app.register(settingsRoutes, { prefix: '/api/v1' });
  await app.register(governanceRoutes, { prefix: '/api/v1' });
  await app.register(extendedRoutes, { prefix: '/api/v1' });

  return app;
}
