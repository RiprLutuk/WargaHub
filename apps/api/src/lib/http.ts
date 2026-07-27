import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function success<T>(
  request: FastifyRequest,
  data: T,
  meta: Record<string, unknown> = {},
): { data: T; meta: Record<string, unknown> & { requestId: string } } {
  return { data, meta: { ...meta, requestId: request.id } };
}

export function sendError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
): void {
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details },
      meta: { requestId: request.id },
    });
    return;
  }

  if (error instanceof ZodError) {
    void reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim belum valid.',
        details: error.flatten(),
      },
      meta: { requestId: request.id },
    });
    return;
  }

  request.log.error({ err: error, requestId: request.id }, 'request failed');
  void reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan. Silakan coba lagi.',
      details: null,
    },
    meta: { requestId: request.id },
  });
}
