import type { FastifyInstance } from 'fastify';
import { ulid } from 'ulidx';
import { loginSchema } from '@wargahub/contracts';
import { z } from 'zod';
import {
  createSession,
  digestToken,
  findUserForLogin,
  hashPassword,
  randomToken,
  safeUserById,
  verifyPassword,
} from '../../lib/auth.js';
import { AppError, success } from '../../lib/http.js';
import { recordAudit } from '../audit/service.js';

const sessionCookieName = 'wargahub_session';
const csrfCookieName = 'wargahub_csrf';
const newPasswordSchema = z.string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, 'Kata sandi perlu huruf kecil.')
  .regex(/[A-Z]/, 'Kata sandi perlu huruf besar.')
  .regex(/\d/, 'Kata sandi perlu angka.');

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/login',
    { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const identifier = input.email ?? input.phone;
      if (!identifier) {
        throw new AppError(422, 'LOGIN_IDENTIFIER_REQUIRED', 'Masukkan email atau nomor telepon.');
      }
      const user = await findUserForLogin(app.database, identifier);
      const passwordValid = user
        ? await verifyPassword(user.password_hash, input.password)
        : false;

      await app.database.query(
        `INSERT INTO login_history
          (id, organization_id, user_id, email, success, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ulid(),
          user?.organization_id ?? null,
          user?.id ?? null,
          identifier,
          Boolean(user && passwordValid && user.status === 'ACTIVE'),
          request.ip,
          request.headers['user-agent'] ?? null,
        ],
      );

      if (!user || !passwordValid) {
        throw new AppError(
          401,
          'INVALID_CREDENTIALS',
          'Email atau kata sandi tidak sesuai.',
        );
      }
      if (user.status !== 'ACTIVE') {
        throw new AppError(
          403,
          'ACCOUNT_INACTIVE',
          'Akun belum aktif. Hubungi pengurus lingkungan.',
        );
      }

      const session = await createSession(app.database, app.config, user, {
        ip: request.ip,
        ...(request.headers['user-agent']
          ? { userAgent: request.headers['user-agent'] }
          : {}),
      });
      const safeUser = await safeUserById(app.database, user.id);
      if (!safeUser) throw new AppError(401, 'INVALID_CREDENTIALS', 'Akun tidak tersedia.');

      reply.setCookie(sessionCookieName, session.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        expires: session.expiresAt,
      });
      reply.setCookie(csrfCookieName, session.csrfToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        expires: session.expiresAt,
      });
      await recordAudit(app.database, {
        organizationId: user.organization_id,
        actorId: user.id,
        action: 'auth.login',
        entityType: 'session',
        entityId: session.id,
        requestId: request.id,
        ipAddress: request.ip,
        ...(request.headers['user-agent']
          ? { userAgent: request.headers['user-agent'] }
          : {}),
      });
      return success(request, { user: safeUser, csrfToken: session.csrfToken });
    },
  );

  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '30 minutes' } } },
    async (request, reply) => {
      const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(request.body);
      const user = await findUserForLogin(app.database, email);
      if (user?.status === 'ACTIVE') {
        const token = randomToken();
        const expiresAt = new Date(Date.now() + 30 * 60_000);
        await app.database.transaction(async (transaction) => {
          await transaction.query(
            `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND used_at IS NULL`,
            [user.id],
          );
          await transaction.query(
            `INSERT INTO password_reset_tokens
              (id, organization_id, user_id, token_digest, expires_at, requested_ip, purpose)
             VALUES ($1, $2, $3, $4, $5, $6, 'PASSWORD_RESET')`,
            [
              ulid(),
              user.organization_id,
              user.id,
              digestToken(token),
              expiresAt.toISOString(),
              request.ip,
            ],
          );
          const resetUrl = `${app.config.PUBLIC_BASE_URL}/reset-password#token=${encodeURIComponent(token)}`;
          await transaction.query(
            `INSERT INTO jobs (id, organization_id, kind, payload)
             VALUES ($1, $2, 'SEND_EMAIL', $3::jsonb)`,
            [
              ulid(),
              user.organization_id,
              JSON.stringify({
                to: user.email,
                subject: 'Atur ulang kata sandi WargaHub',
                text: `Gunakan tautan berikut dalam 30 menit: ${resetUrl}`,
              }),
            ],
          );
        });
      }
      return reply.status(202).send(
        success(request, {
          message: 'Jika akun terdaftar, petunjuk pemulihan akan dikirim melalui email.',
        }),
      );
    },
  );

  app.post(
    '/accept-invitation',
    { config: { rateLimit: { max: 8, timeWindow: '30 minutes' } } },
    async (request) => {
      const input = z.object({
        token: z.string().min(32).max(200),
        password: newPasswordSchema,
      }).parse(request.body);
      const passwordHash = await hashPassword(input.password);
      await app.database.transaction(async (transaction) => {
        const claimed = await transaction.query<{
          id: string;
          user_id: string;
          organization_id: string;
        }>(
          `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
           WHERE token_digest = $1 AND purpose = 'INVITATION'
             AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
             AND EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = password_reset_tokens.user_id
                 AND u.organization_id = password_reset_tokens.organization_id
                 AND u.status = 'INVITED'
             )
           RETURNING id, user_id, organization_id`,
          [digestToken(input.token)],
        );
        const invitation = claimed.rows[0];
        if (!invitation) {
          throw new AppError(
            400,
            'INVITATION_TOKEN_INVALID',
            'Undangan tidak valid, sudah digunakan, atau kedaluwarsa.',
          );
        }
        const activated = await transaction.query<{ id: string }>(
          `UPDATE users SET password_hash = $1, status = 'ACTIVE',
             privacy_consent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND organization_id = $3 AND status = 'INVITED'
           RETURNING id`,
          [passwordHash, invitation.user_id, invitation.organization_id],
        );
        if (!activated.rows[0]) {
          throw new AppError(400, 'INVITATION_TOKEN_INVALID', 'Undangan tidak dapat digunakan.');
        }
        await recordAudit(transaction, {
          organizationId: invitation.organization_id,
          actorId: invitation.user_id,
          action: 'auth.invitation.accept',
          entityType: 'user',
          entityId: invitation.user_id,
          requestId: request.id,
          ipAddress: request.ip,
        });
      });
      return success(request, { message: 'Akun berhasil diaktifkan. Silakan masuk.' });
    },
  );

  app.post(
    '/reset-password',
    { config: { rateLimit: { max: 8, timeWindow: '30 minutes' } } },
    async (request) => {
      const input = z
        .object({
          token: z.string().min(32).max(200),
          password: newPasswordSchema,
        })
        .parse(request.body);
      const passwordHash = await hashPassword(input.password);
      await app.database.transaction(async (transaction) => {
        const claimed = await transaction.query<{
          id: string;
          user_id: string;
          organization_id: string;
        }>(
          `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
           WHERE token_digest = $1 AND purpose = 'PASSWORD_RESET'
             AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
           RETURNING id, user_id, organization_id`,
          [digestToken(input.token)],
        );
        const reset = claimed.rows[0];
        if (!reset) {
          throw new AppError(400, 'RESET_TOKEN_INVALID', 'Tautan pemulihan tidak valid atau kedaluwarsa.');
        }
        await transaction.query(
          `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND organization_id = $3 AND status = 'ACTIVE'`,
          [passwordHash, reset.user_id, reset.organization_id],
        );
        await transaction.query(
          `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND revoked_at IS NULL`,
          [reset.user_id],
        );
        await recordAudit(transaction, {
          organizationId: reset.organization_id,
          actorId: reset.user_id,
          action: 'auth.password.reset',
          entityType: 'user',
          entityId: reset.user_id,
          requestId: request.id,
          ipAddress: request.ip,
        });
      });
      return success(request, { message: 'Kata sandi berhasil diperbarui.' });
    },
  );

  app.get('/me', { preHandler: app.authenticate }, async (request) => {
    const { sessionId: _sessionId, csrfToken: _csrfToken, ...user } = request.auth!;
    return success(request, { user });
  });

  app.post(
    '/logout',
    { preHandler: app.authenticate },
    async (request, reply) => {
      app.requireCsrf(request);
      await app.database.query(
        `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [request.auth?.sessionId, request.auth?.id],
      );
      reply.clearCookie(sessionCookieName, { path: '/' });
      reply.clearCookie(csrfCookieName, { path: '/' });
      return success(request, { message: 'Anda telah keluar.' });
    },
  );

  app.post(
    '/logout-all',
    { preHandler: app.authenticate },
    async (request, reply) => {
      app.requireCsrf(request);
      await app.database.query(
        `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [request.auth?.id],
      );
      reply.clearCookie(sessionCookieName, { path: '/' });
      reply.clearCookie(csrfCookieName, { path: '/' });
      return success(request, { message: 'Semua sesi telah diakhiri.' });
    },
  );
}

export { csrfCookieName, sessionCookieName };
