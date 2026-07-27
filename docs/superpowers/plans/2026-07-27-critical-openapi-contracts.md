# Critical OpenAPI Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/documentation/json` a useful, accurate integration contract for WargaHub's critical authentication, payment, finance, complaint, file, and public APIs.

**Architecture:** Keep runtime route validation and serialization unchanged. Add reusable OpenAPI components and a documentation-only `@fastify/swagger` transform keyed by HTTP method and route URL; the transform supplies tags, auth, request inputs, and responses only while Swagger generates the document.

**Tech Stack:** TypeScript, Fastify 5, `@fastify/swagger` 9, OpenAPI 3, Vitest.

---

### Task 1: Specify the generated contract with failing tests

**Files:**
- Modify: `apps/api/src/openapi.test.ts`

- [ ] **Step 1: Add component and tag assertions**

```ts
expect(document.components.securitySchemes.sessionCookie).toMatchObject({
  type: 'apiKey',
  in: 'cookie',
  name: 'wargahub_session',
});
expect(document.components.schemas).toHaveProperty('SuccessEnvelope');
expect(document.components.schemas).toHaveProperty('ErrorEnvelope');
expect(document.components.schemas).toHaveProperty('RequestId');
expect(document.tags.map((tag: { name: string }) => tag.name)).toEqual(
  expect.arrayContaining(['Auth', 'Billing', 'Finance', 'Complaints', 'Files', 'Public']),
);
```

- [ ] **Step 2: Add critical operation assertions**

Check these method/path pairs for non-empty tags, summary, request schema where applicable, explicit success/default error responses, and cookie security on protected routes:

```text
POST /api/v1/auth/login
POST /api/v1/auth/accept-invitation
GET,POST /api/v1/bills
POST /api/v1/bills/{id}/payments
GET /api/v1/payments
POST /api/v1/payments/{id}/verify
POST /api/v1/payments/{id}/reject
POST /api/v1/finance/transactions/{id}/reverse
GET,POST /api/v1/complaints
GET /api/v1/complaints/{id}
POST /api/v1/complaints/{id}/comments
POST /api/v1/complaints/{id}/assign
POST /api/v1/complaints/{id}/status
POST /api/v1/files
GET /api/v1/files/{id}
GET /api/v1/public/files/{id}
GET /api/v1/public/site
GET /api/v1/public/announcements
GET /api/v1/public/documents
GET /api/v1/public/documents/{id}/download
GET /api/v1/public/transparency
GET /api/v1/public/events
```

Assert that payment submission documents required `Idempotency-Key`, protected mutations document `x-csrf-token`, file upload uses `multipart/form-data`, and file/document downloads advertise binary content.

- [ ] **Step 3: Run the test and verify RED**

Run: `bun run test src/openapi.test.ts` from `apps/api`.

Expected: failures for missing `components.securitySchemes.sessionCookie`, reusable schemas, tags, and critical request/response declarations.

### Task 2: Add documentation-only OpenAPI definitions

**Files:**
- Create: `apps/api/src/lib/openapi.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Define reusable components**

Export an `openApiDocument` object containing:

```ts
components: {
  securitySchemes: {
    sessionCookie: { type: 'apiKey', in: 'cookie', name: 'wargahub_session' },
  },
  schemas: {
    RequestId: { type: 'string', minLength: 1, maxLength: 100 },
    SuccessEnvelope: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {},
        meta: {
          type: 'object',
          required: ['requestId'],
          properties: { requestId: { $ref: '#/components/schemas/RequestId' } },
          additionalProperties: true,
        },
      },
    },
    ErrorEnvelope: {
      type: 'object',
      required: ['error', 'meta'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message', 'details'],
          properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} },
        },
        meta: {
          type: 'object',
          required: ['requestId'],
          properties: { requestId: { $ref: '#/components/schemas/RequestId' } },
        },
      },
    },
  },
}
```

Also declare the six top-level tags from Task 1.

- [ ] **Step 2: Define route schemas**

Create method/path-keyed schemas for every operation in Task 1. Use reusable helpers for ID params, pagination query, request ID/CSRF/idempotency headers, session-cookie security, JSON success/error responses, and binary responses. Bodies must mirror the current Zod/handler inputs, including login email-or-phone alternatives, invitation password rules, bill/payment fields, reversal reason, complaint actions, and multipart `file` upload.

- [ ] **Step 3: Export the Swagger transform**

```ts
export const openApiTransform: SwaggerTransform = ({ schema, url, route }) => {
  const method = Array.isArray(route.method) ? route.method[0] : route.method;
  const documented = criticalRoutes[`${method.toUpperCase()} ${url}`];
  return { schema: documented ? { ...schema, ...documented } : schema, url };
};
```

- [ ] **Step 4: Register document options and transform**

Update the existing Swagger registration in `apps/api/src/app.ts`:

```ts
await app.register(swagger, {
  stripBasePath: false,
  openapi: openApiDocument,
  transform: openApiTransform,
});
```

- [ ] **Step 5: Run the OpenAPI test and verify GREEN**

Run: `bun run test src/openapi.test.ts` from `apps/api`.

Expected: all OpenAPI assertions pass while the existing request-ID envelope test remains green.

### Task 3: Verify compilation and runtime behavior

**Files:**
- Verify: `apps/api/src/lib/openapi.ts`
- Verify: `apps/api/src/app.ts`
- Verify: `apps/api/src/openapi.test.ts`

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck` from `apps/api`.

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run: `bun run build` from `apps/api`.

Expected: exit code 0.

- [ ] **Step 3: Re-run focused tests**

Run: `bun run test src/openapi.test.ts` from `apps/api`.

Expected: 2 tests pass with no failures.

