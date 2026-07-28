import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: optionalUrl,
  PGLITE_DATA_DIR: z.string().default('.data/wargahub'),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(168).default(8),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10_485_760),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('WargaHub <noreply@example.org>'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // WAHA (WhatsApp HTTP API Gateway) Integration Configs
  WAHA_BASE_URL: z.string().url().default('http://localhost:3001'),
  WAHA_API_KEY: z.string().optional(),
  WAHA_SESSION: z.string().default('default'),
  WAHA_ENABLED: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(
  environment: Record<string, string | undefined> = process.env,
): AppConfig {
  return environmentSchema.parse(environment);
}
