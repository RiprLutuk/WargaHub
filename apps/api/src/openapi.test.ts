import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { createDatabase, type Database } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { seedDemoData } from './seed.js';

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  oneOf?: OpenApiSchema[];
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  security?: Array<Record<string, unknown>>;
  parameters?: Array<{
    in: string;
    name: string;
    required?: boolean;
    schema?: OpenApiSchema;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  responses: Record<
    string,
    {
      content?: Record<string, { schema?: OpenApiSchema }>;
    }
  >;
};

type OpenApiDocument = {
  tags?: Array<{ name: string }>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
};

function operation(
  document: OpenApiDocument,
  method: string,
  path: string,
): OpenApiOperation {
  const documented = document.paths[path]?.[method];
  if (!documented) throw new Error(`Missing OpenAPI operation: ${method.toUpperCase()} ${path}`);
  return documented;
}

function parameter(
  documented: OpenApiOperation,
  location: string,
  name: string,
) {
  return documented.parameters?.find(
    (candidate) =>
      candidate.in === location && candidate.name.toLowerCase() === name.toLowerCase(),
  );
}

function responseSchema(documented: OpenApiOperation, status: string): OpenApiSchema | undefined {
  return documented.responses[status]?.content?.['application/json']?.schema;
}

function jsonRequestSchema(documented: OpenApiOperation): OpenApiSchema | undefined {
  return documented.requestBody?.content?.['application/json']?.schema;
}

describe('API platform contract', () => {
  let database: Database;
  let app: FastifyInstance;

  beforeAll(async () => {
    database = await createDatabase({ dataDir: 'memory://' });
    await runMigrations(database);
    await seedDemoData(database, { includeSampleContent: false });
    app = await buildApp({ database, logger: false });
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it('returns request IDs in success and error envelopes', async () => {
    const ok = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'request-platform-check' },
    });
    const missing = await app.inject({ method: 'GET', url: '/api/v1/missing' });

    expect(ok.json().meta.requestId).toBe('request-platform-check');
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
    expect(missing.json().meta.requestId).toBeTruthy();
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
  });

  it('publishes OpenAPI for registered core routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().paths['/api/v1/bills']).toBeTruthy();
    expect(response.json().paths['/api/v1/complaints']).toBeTruthy();
    expect(response.json().paths['/api/v1/activities']).toBeTruthy();
  });

  it('documents reusable authentication, envelope, request ID, and tag components', async () => {
    const response = await app.inject({ method: 'GET', url: '/documentation/json' });
    const document = response.json() as OpenApiDocument;

    expect(document.components?.securitySchemes?.sessionCookie).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'wargahub_session',
    });
    expect(document.components?.schemas).toHaveProperty('SuccessEnvelope');
    expect(document.components?.schemas).toHaveProperty('ErrorEnvelope');
    expect(document.components?.schemas).toHaveProperty('RequestId');
    expect(document.tags?.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(['Auth', 'Billing', 'Finance', 'Complaints', 'Files', 'Public']),
    );
  });

  it('documents critical JSON operations with accurate bodies, auth, and envelopes', async () => {
    const response = await app.inject({ method: 'GET', url: '/documentation/json' });
    const document = response.json() as OpenApiDocument;
    const criticalOperations = [
      ['post', '/api/v1/auth/login', 'Auth', '200', false],
      ['post', '/api/v1/auth/accept-invitation', 'Auth', '200', false],
      ['get', '/api/v1/bills', 'Billing', '200', true],
      ['get', '/api/v1/bills/{id}', 'Billing', '200', true],
      ['post', '/api/v1/bills', 'Billing', '201', true],
      ['post', '/api/v1/bills/{id}/payments', 'Billing', '201', true],
      ['get', '/api/v1/payments', 'Billing', '200', true],
      ['post', '/api/v1/payments/{id}/verify', 'Billing', '200', true],
      ['post', '/api/v1/payments/{id}/reject', 'Billing', '200', true],
      ['post', '/api/v1/finance/transactions/{id}/reverse', 'Finance', '200', true],
      ['get', '/api/v1/complaints', 'Complaints', '200', true],
      ['post', '/api/v1/complaints', 'Complaints', '201', true],
      ['get', '/api/v1/complaints/{id}', 'Complaints', '200', true],
      ['post', '/api/v1/complaints/{id}/comments', 'Complaints', '201', true],
      ['post', '/api/v1/complaints/{id}/assign', 'Complaints', '200', true],
      ['post', '/api/v1/complaints/{id}/status', 'Complaints', '200', true],
      ['post', '/api/v1/files', 'Files', '201', true],
      ['get', '/api/v1/public/site', 'Public', '200', false],
      ['get', '/api/v1/public/announcements', 'Public', '200', false],
      ['get', '/api/v1/public/documents', 'Public', '200', false],
      ['get', '/api/v1/public/transparency', 'Public', '200', false],
      ['get', '/api/v1/public/events', 'Public', '200', false],
    ] as const;

    for (const [method, path, tag, successStatus, secured] of criticalOperations) {
      const documented = operation(document, method, path);
      expect(documented.tags ?? [], `${method.toUpperCase()} ${path} tags`).toContain(tag);
      expect(documented.summary, `${method.toUpperCase()} ${path} summary`).toBeTruthy();
      expect(documented.responses, `${method.toUpperCase()} ${path} responses`).toHaveProperty(
        successStatus,
      );
      expect(responseSchema(documented, successStatus)).toMatchObject({
        $ref: '#/components/schemas/SuccessEnvelope',
      });
      expect(responseSchema(documented, 'default')).toMatchObject({
        $ref: '#/components/schemas/ErrorEnvelope',
      });
      expect(parameter(documented, 'header', 'x-request-id')?.schema).toMatchObject({
        $ref: '#/components/schemas/RequestId',
      });
      if (secured) {
        expect(documented.security).toEqual([{ sessionCookie: [] }]);
      } else {
        expect(documented.security ?? []).toEqual([]);
      }
    }

    const loginBody = jsonRequestSchema(operation(document, 'post', '/api/v1/auth/login'));
    expect(loginBody?.oneOf).toHaveLength(2);
    expect(loginBody?.oneOf?.[0]?.required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(loginBody?.oneOf?.[1]?.required).toEqual(expect.arrayContaining(['phone', 'password']));

    const bodyCases = [
      ['/api/v1/auth/accept-invitation', ['token', 'password']],
      ['/api/v1/bills', ['householdId', 'title', 'description', 'period', 'dueAt', 'amount']],
      ['/api/v1/bills/{id}/payments', ['amount', 'method']],
      ['/api/v1/payments/{id}/reject', ['reason']],
      ['/api/v1/finance/transactions/{id}/reverse', ['reason']],
      ['/api/v1/complaints', ['category', 'title', 'description']],
      ['/api/v1/complaints/{id}/comments', ['body']],
      ['/api/v1/complaints/{id}/assign', ['assigneeId']],
      ['/api/v1/complaints/{id}/status', ['status']],
    ] as const;
    for (const [path, requiredFields] of bodyCases) {
      const body = jsonRequestSchema(operation(document, 'post', path));
      expect(body?.required, `${path} required body fields`).toEqual(
        expect.arrayContaining([...requiredFields]),
      );
      for (const field of requiredFields) {
        expect(body?.properties, `${path} body property ${field}`).toHaveProperty(field);
      }
    }
    expect(
      jsonRequestSchema(operation(document, 'post', '/api/v1/bills/{id}/payments'))?.properties,
    ).not.toHaveProperty('idempotencyKey');
  });

  it('documents critical headers, pagination, multipart upload, and binary downloads', async () => {
    const response = await app.inject({ method: 'GET', url: '/documentation/json' });
    const document = response.json() as OpenApiDocument;
    const csrfOperations = [
      '/api/v1/bills',
      '/api/v1/bills/{id}/payments',
      '/api/v1/payments/{id}/verify',
      '/api/v1/payments/{id}/reject',
      '/api/v1/finance/transactions/{id}/reverse',
      '/api/v1/complaints',
      '/api/v1/complaints/{id}/comments',
      '/api/v1/complaints/{id}/assign',
      '/api/v1/complaints/{id}/status',
      '/api/v1/files',
    ];
    for (const path of csrfOperations) {
      expect(parameter(operation(document, 'post', path), 'header', 'x-csrf-token')).toMatchObject({
        required: true,
      });
    }
    expect(
      parameter(
        operation(document, 'post', '/api/v1/bills/{id}/payments'),
        'header',
        'Idempotency-Key',
      ),
    ).toMatchObject({ required: true });

    for (const path of [
      '/api/v1/public/announcements',
      '/api/v1/public/documents',
      '/api/v1/public/events',
    ]) {
      const documented = operation(document, 'get', path);
      expect(parameter(documented, 'query', 'page')).toBeTruthy();
      expect(parameter(documented, 'query', 'pageSize')).toBeTruthy();
    }
    for (const path of [
      '/api/v1/bills',
      '/api/v1/public/announcements',
      '/api/v1/public/documents',
    ]) {
      expect(parameter(operation(document, 'get', path), 'query', 'search')).toBeTruthy();
    }
    for (const path of [
      '/api/v1/payments',
      '/api/v1/complaints',
      '/api/v1/public/events',
    ]) {
      expect(parameter(operation(document, 'get', path), 'query', 'search')).toBeUndefined();
    }

    for (const path of [
      '/api/v1/payments/{id}/reject',
      '/api/v1/finance/transactions/{id}/reverse',
    ]) {
      expect(jsonRequestSchema(operation(document, 'post', path))?.properties?.reason).not
        .toHaveProperty('maxLength');
    }
    expect(
      jsonRequestSchema(
        operation(document, 'post', '/api/v1/complaints/{id}/status'),
      )?.properties?.message,
    ).not.toHaveProperty('maxLength');

    const upload = operation(document, 'post', '/api/v1/files');
    const uploadSchema = upload.requestBody?.content?.['multipart/form-data']?.schema;
    expect(uploadSchema?.required).toContain('file');
    expect(uploadSchema?.properties?.file).toMatchObject({ type: 'string', format: 'binary' });

    for (const [path, tag] of [
      ['/api/v1/files/{id}', 'Files'],
      ['/api/v1/public/files/{id}', 'Files'],
      ['/api/v1/public/documents/{id}/download', 'Public'],
    ] as const) {
      const download = operation(document, 'get', path);
      expect(download.tags).toContain(tag);
      expect(parameter(download, 'path', 'id')).toMatchObject({ required: true });
      const media = Object.values(download.responses['200']?.content ?? {});
      expect(media.some((item) => item.schema?.format === 'binary')).toBe(true);
      expect(responseSchema(download, 'default')).toMatchObject({
        $ref: '#/components/schemas/ErrorEnvelope',
      });
    }
  });
});
