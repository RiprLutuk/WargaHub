import type { Permission, Role, SafeUser } from '@wargahub/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import type { Database } from '../db/client.js';

export type AuthContext = SafeUser & {
  sessionId: string;
  csrfToken: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    database: Database;
    config: AppConfig;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireCsrf(request: FastifyRequest): void;
    requirePermission(
      permission: Permission,
    ): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export type { Permission, Role };
