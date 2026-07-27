# WargaHub MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun WargaHub MVP yang dapat dijalankan sebagai web responsif/PWA, REST API, dan deployment mandiri untuk satu organisasi dengan seluruh data bisnis tetap memiliki `organization_id`.

**Architecture:** Monorepo Bun berisi Vue 3 SPA dan Fastify modular monolith yang hanya berkomunikasi lewat `/api/v1`. Backend memakai PostgreSQL di production dan PGlite (PostgreSQL-compatible) untuk development/test, dengan authorization, audit, serta privacy checks di service boundary. UI dibagi menjadi public site, portal warga, dan CMS berbasis role, dengan Bahasa Indonesia dan progressive disclosure.

**Tech Stack:** Bun workspaces, TypeScript, Vue 3, Vite, Vue Router, Pinia, Fastify, Zod, PostgreSQL/PGlite, Argon2id, Vitest, Vue Test Utils, Playwright, PWA, Docker Compose, Caddy.

---

## Scope decisions

- MVP memakai email + password dan opaque cookie session; OTP/WhatsApp tetap feature flag nonaktif.
- Instalasi awal single-organization, namun setiap record bisnis diberi `organization_id`.
- Zona waktu awal `Asia/Jakarta`, locale `id-ID`, mata uang `IDR`, dan uang disimpan sebagai integer rupiah.
- Pengaduan anonim publik nonaktif; pelapor boleh menyembunyikan identitas dari warga lain.
- Transparansi keuangan publik hanya agregat pemasukan, pengeluaran, dan saldo; bukti dan identitas tidak dipublikasikan.
- Surat, voting, fasilitas, jimpitan khusus, program, sampah, UMKM, bantuan sosial, kendaraan, dan tamu berada setelah MVP sebagaimana bagian 29.2 PRD.
- Semua modul MVP aktif secara default dan dapat dinonaktifkan melalui konfigurasi organisasi.

## File map

```text
apps/api/src/app.ts                         Fastify composition root
apps/api/src/server.ts                      HTTP process and graceful shutdown
apps/api/src/config.ts                      validated environment config
apps/api/src/db/client.ts                   PostgreSQL/PGlite adapter
apps/api/src/db/migrate.ts                  tracked SQL migration runner
apps/api/src/db/migrations/0001_initial.sql core MVP schema
apps/api/src/lib/auth.ts                    session parsing and password hashing
apps/api/src/lib/http.ts                    response envelopes and app errors
apps/api/src/lib/policy.ts                  RBAC permission guard
apps/api/src/modules/*                      bounded MVP route/service/schema files
apps/api/src/seed.ts                        safe idempotent demo organization
apps/web/src/App.vue                        application root
apps/web/src/router.ts                      public/resident/admin routes and guards
apps/web/src/stores/session.ts              current user and session state
apps/web/src/lib/api.ts                     typed REST client and CSRF handling
apps/web/src/components/*                   shared navigation/status/form components
apps/web/src/layouts/*                      public, resident, and admin shells
apps/web/src/pages/public/*                 landing/transparency/public content
apps/web/src/pages/app/*                    resident workflows
apps/web/src/pages/admin/*                  CMS workflows
apps/web/src/styles/*                       accessible visual system and responsive CSS
packages/contracts/src/index.ts             shared schemas/enums/API types
infra/caddy/Caddyfile                       reverse proxy and secure headers
scripts/backup.sh                           encrypted-compatible database/file backup
scripts/restore.sh                          explicit restore procedure
docs/*                                      architecture, API, operation, security docs
```

### Task 1: Workspace and quality foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/api/package.json`
- Create: `apps/web/package.json`
- Create: `packages/contracts/package.json`
- Create: `README.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the workspace commands**

```json
{
  "name": "wargahub",
  "private": true,
  "packageManager": "bun@1.3.12",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun --filter '*' dev",
    "build": "bun --filter '*' build",
    "test": "bun --filter '*' test",
    "typecheck": "bun --filter '*' typecheck",
    "check": "bun run typecheck && bun run test && bun run build"
  }
}
```

- [ ] **Step 2: Add strict shared TypeScript settings and package manifests**

Use `ES2022`, `NodeNext` for the API, `Bundler` for the web package, `strict: true`, `noUncheckedIndexedAccess: true`, and workspace dependency `@wargahub/contracts`.

- [ ] **Step 3: Install dependencies**

Run: `bun install`

Expected: lockfile `bun.lock` is created and install exits 0.

- [ ] **Step 4: Add project governance and CI**

README must document demo credentials, local commands, privacy principles, and the production deployment path. CI runs `bun install --frozen-lockfile`, `bun run typecheck`, `bun run test`, and `bun run build`.

### Task 2: Shared contracts and database foundation

**Files:**
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/contracts.test.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/migrations/0001_initial.sql`
- Create: `apps/api/src/config.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from 'vitest';
import { complaintCreateSchema, moneySchema, paymentStatusSchema } from './index';

describe('shared contracts', () => {
  it('rejects negative rupiah values', () => {
    expect(moneySchema.safeParse(-1).success).toBe(false);
  });

  it('only accepts known payment states', () => {
    expect(paymentStatusSchema.parse('PENDING_VERIFICATION')).toBe('PENDING_VERIFICATION');
    expect(paymentStatusSchema.safeParse('UNKNOWN').success).toBe(false);
  });

  it('requires a useful complaint description', () => {
    expect(complaintCreateSchema.safeParse({ category: 'FASILITAS', title: 'Lampu', description: 'mati' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `bun test packages/contracts/src/contracts.test.ts`

Expected: FAIL because the schemas are not exported.

- [ ] **Step 3: Implement schemas and stable enums**

```ts
import { z } from 'zod';

export const moneySchema = z.number().int().nonnegative();
export const paymentStatusSchema = z.enum(['PENDING_VERIFICATION', 'PAID', 'REJECTED']);
export const complaintStatusSchema = z.enum([
  'DRAFT', 'SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS',
  'WAITING_FOR_REPORTER', 'WAITING_FOR_VENDOR', 'RESOLVED', 'REJECTED', 'CLOSED'
]);
export const complaintCreateSchema = z.object({
  category: z.string().trim().min(2).max(60),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(5000),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  location: z.string().trim().max(240).optional()
});
```

- [ ] **Step 4: Run the contract test and verify GREEN**

Run: `bun test packages/contracts/src/contracts.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Add a tracked PostgreSQL schema**

The first migration creates organizations, areas, households, users, memberships, roles, permissions, sessions, announcements, bills, payments, cash accounts, finance transactions, complaints and histories, activities and responses, patrol assignments and swaps, documents, notifications, audit logs, files, jobs, and settings. Every business table includes `organization_id`; vote-like and payment idempotency constraints are unique; finance rows are immutable and reversible.

- [ ] **Step 6: Test migration on an isolated PGlite database**

Run: `bun run --cwd apps/api db:test-migrate`

Expected: migration reports `0001_initial applied` and a second run reports `database up to date`.

### Task 3: Authentication, session security, RBAC, and audit

**Files:**
- Create: `apps/api/src/app.test.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/lib/http.ts`
- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/lib/policy.ts`
- Create: `apps/api/src/modules/auth/routes.ts`
- Create: `apps/api/src/modules/audit/service.ts`

- [ ] **Step 1: Write failing authentication and authorization tests**

```ts
it('logs in an active user without exposing the password hash', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'warga@demo.local', password: 'WargaHub123!' } });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.user.email).toBe('warga@demo.local');
  expect(response.body).not.toContain('passwordHash');
  expect(response.cookies.some((cookie) => cookie.name === 'wargahub_session')).toBe(true);
});

it('blocks inactive accounts', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'inactive@demo.local', password: 'WargaHub123!' } });
  expect(response.statusCode).toBe(403);
});

it('prevents a resident from creating bills', async () => {
  const response = await asResident({ method: 'POST', url: '/api/v1/bills', payload: validBill });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe('FORBIDDEN');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun test apps/api/src/app.test.ts -t 'logs in|blocks inactive|prevents a resident'`

Expected: FAIL because the app/auth policy does not exist.

- [ ] **Step 3: Implement opaque sessions and granular policies**

Passwords use Argon2id. Session tokens are random 256-bit values whose SHA-256 digest is stored; cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and expire after eight hours. Implement `requireUser`, `requirePermission`, organization scoping, session rotation, logout, logout-all, and rate-limited login. Sensitive actions call `recordAudit({ actorId, action, entityType, entityId, requestId, before, after })`.

- [ ] **Step 4: Run auth and policy tests and verify GREEN**

Run: `bun test apps/api/src/app.test.ts -t 'logs in|blocks inactive|prevents a resident'`

Expected: 3 tests PASS.

### Task 4: Organization, households, residents, announcements, documents, and public API

**Files:**
- Create: `apps/api/src/modules/organizations/routes.ts`
- Create: `apps/api/src/modules/households/routes.ts`
- Create: `apps/api/src/modules/announcements/routes.ts`
- Create: `apps/api/src/modules/documents/routes.ts`
- Create: `apps/api/src/modules/public/routes.ts`
- Create: `apps/api/src/modules/content/content.test.ts`

- [ ] **Step 1: Write failing privacy and publication tests**

```ts
it('shows public visitors only published public announcements', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/v1/public/announcements' });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.every((item: { visibility: string; status: string }) => item.visibility === 'PUBLIC' && item.status === 'PUBLISHED')).toBe(true);
});

it('does not let one household read another household record', async () => {
  const response = await asResident({ method: 'GET', url: `/api/v1/households/${otherHouseholdId}` });
  expect(response.statusCode).toBe(404);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `bun test apps/api/src/modules/content/content.test.ts`

Expected: FAIL because content routes do not exist.

- [ ] **Step 3: Implement scoped CRUD and public projections**

Admin routes support paginated/filterable households and residents, validated CSV import/export, announcement draft/schedule/publish/archive, and public/internal documents. Resident routes expose only authorized household memberships. Public routes use explicit projections that omit phone, email, household, payment, file proof, and private notes.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `bun test apps/api/src/modules/content/content.test.ts`

Expected: all content and IDOR tests PASS.

### Task 5: Billing, payments, and finance

**Files:**
- Create: `apps/api/src/modules/billing/service.ts`
- Create: `apps/api/src/modules/billing/routes.ts`
- Create: `apps/api/src/modules/finance/service.ts`
- Create: `apps/api/src/modules/finance/routes.ts`
- Create: `apps/api/src/modules/billing/billing.test.ts`

- [ ] **Step 1: Write failing payment and ledger tests**

```ts
it('allocates a manual payment and refuses double verification', async () => {
  const pending = await createPayment({ amount: 150_000, billId, householdId });
  const first = await verifyPayment(pending.id, treasurer);
  expect(first.status).toBe('PAID');
  await expect(verifyPayment(pending.id, treasurer)).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_VERIFIED' });
});

it('calculates balance from posted entries and reversals', async () => {
  await postTransaction({ kind: 'INCOME', amount: 500_000 });
  const expense = await postTransaction({ kind: 'EXPENSE', amount: 125_000 });
  await reverseTransaction(expense.id, 'Koreksi pencatatan');
  expect(await cashBalance()).toBe(500_000);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun test apps/api/src/modules/billing/billing.test.ts`

Expected: FAIL because billing and finance services are absent.

- [ ] **Step 3: Implement atomic payment verification and immutable ledger**

Create one-time and recurring bills scoped to a household. A resident may only see/pay bills for a linked household. Manual payment creates `PENDING_VERIFICATION`; verification uses a transaction and compare-and-set status, creates income exactly once, stores an audit record, and emits an in-app notification. Finance export streams sanitized CSV; public transparency returns monthly aggregates only. Correction creates a reversal row and never deletes the source row.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `bun test apps/api/src/modules/billing/billing.test.ts`

Expected: payment, balance, privacy, idempotency, CSV, and reversal tests PASS.

### Task 6: Complaints, activities, patrol swaps, and notifications

**Files:**
- Create: `apps/api/src/modules/complaints/routes.ts`
- Create: `apps/api/src/modules/activities/routes.ts`
- Create: `apps/api/src/modules/patrols/routes.ts`
- Create: `apps/api/src/modules/notifications/routes.ts`
- Create: `apps/api/src/modules/operations/operations.test.ts`

- [ ] **Step 1: Write failing workflow tests**

```ts
it('keeps private complaints invisible to unrelated residents and records status history', async () => {
  const complaint = await residentA.createComplaint({ ...validComplaint, visibility: 'PRIVATE' });
  expect((await residentB.get(`/complaints/${complaint.id}`)).statusCode).toBe(404);
  await admin.post(`/complaints/${complaint.id}/status`, { status: 'IN_PROGRESS' });
  expect((await residentA.get(`/complaints/${complaint.id}`)).json().data.history.at(-1).status).toBe('IN_PROGRESS');
});

it('accepts a patrol swap once and updates both assignments', async () => {
  const swap = await residentA.requestSwap(assignmentA, assignmentB);
  await residentB.acceptSwap(swap.id);
  const result = await coordinator.approveSwap(swap.id);
  expect(result.data.status).toBe('APPROVED');
  expect(result.data.assignments.map((item: { userId: string }) => item.userId)).toEqual([residentB.id, residentA.id]);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun test apps/api/src/modules/operations/operations.test.ts`

Expected: FAIL because operation workflows are absent.

- [ ] **Step 3: Implement explicit state machines**

Complaints validate allowed transitions and append immutable history. Activities expose contribution types (`HADIR`, `KONSUMSI`, `ALAT`, `DANA`, `ADMINISTRASI`, `DOKUMENTASI`, `JARAK_JAUH`, `DISPENSASI`) plus remaining needs. Patrol swaps require request, target acceptance, optional coordinator approval, and atomic assignment exchange. Each workflow sends deduplicated in-app notifications; worker-ready email jobs are stored in the jobs table.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `bun test apps/api/src/modules/operations/operations.test.ts`

Expected: complaint privacy/history, alternative contribution, swap, and notification tests PASS.

### Task 7: Fastify composition, OpenAPI, health, seed, and API hardening

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/worker.ts`
- Create: `apps/api/src/seed.ts`
- Create: `apps/api/src/openapi.test.ts`

- [ ] **Step 1: Write failing platform tests**

```ts
it('returns request IDs in success and error envelopes', async () => {
  const ok = await app.inject({ method: 'GET', url: '/health' });
  const missing = await app.inject({ method: 'GET', url: '/api/v1/missing' });
  expect(ok.json().meta.requestId).toBeTruthy();
  expect(missing.json().error.code).toBe('NOT_FOUND');
  expect(missing.json().meta.requestId).toBeTruthy();
});

it('publishes OpenAPI for every registered API route', async () => {
  const response = await app.inject({ method: 'GET', url: '/documentation/json' });
  expect(response.statusCode).toBe(200);
  expect(response.json().paths['/api/v1/bills']).toBeTruthy();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun test apps/api/src/openapi.test.ts`

Expected: FAIL because the composition root is incomplete.

- [ ] **Step 3: Register plugins and route boundaries**

Add security headers, CORS allowlist, cookies, multipart MIME/size validation, login and public endpoint rate limits, OpenAPI, normalized Zod errors, `/health`, `/ready`, request IDs, graceful shutdown, scheduled announcement publishing, notification retry, session cleanup, and idempotent demo seed.

- [ ] **Step 4: Run all API tests and verify GREEN**

Run: `bun test apps/api`

Expected: all API tests PASS without warnings.

### Task 8: Accessible Vue PWA and public site

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/App.vue`
- Create: `apps/web/src/router.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/base.css`
- Create: `apps/web/src/layouts/PublicLayout.vue`
- Create: `apps/web/src/pages/public/HomePage.vue`
- Create: `apps/web/src/pages/public/AnnouncementsPage.vue`
- Create: `apps/web/src/pages/public/TransparencyPage.vue`
- Create: `apps/web/src/pages/public/EmergencyPage.vue`
- Create: `apps/web/src/pages/LoginPage.vue`
- Create: `apps/web/src/pages/public/public.test.ts`

- [ ] **Step 1: Write failing public UI tests**

```ts
it('renders the public identity without exposing resident data', async () => {
  const wrapper = mount(HomePage, { global: testGlobal });
  await flushPromises();
  expect(wrapper.get('h1').text()).toContain('WargaHub');
  expect(wrapper.text()).toContain('Pengumuman terbaru');
  expect(wrapper.text()).not.toContain('warga@demo.local');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test apps/web/src/pages/public/public.test.ts`

Expected: FAIL because public pages do not exist.

- [ ] **Step 3: Build the visual system and public routes**

Use a warm civic palette (ink, teal, cream, amber), readable 16px base type, 44px controls, strong focus rings, skip link, semantic landmarks, and status labels containing text/icons rather than color alone. Build `/`, `/pengumuman`, `/agenda`, `/transparansi`, `/dokumen`, `/kontak`, `/darurat`, and `/login`; include loading, empty, error, and offline states. Configure a manifest, installable icons, and service worker navigation fallback.

- [ ] **Step 4: Run public UI tests and verify GREEN**

Run: `bun test apps/web/src/pages/public/public.test.ts`

Expected: public UI and accessibility assertions PASS.

### Task 9: Resident portal and admin CMS

**Files:**
- Create: `apps/web/src/stores/session.ts`
- Create: `apps/web/src/layouts/AppLayout.vue`
- Create: `apps/web/src/layouts/AdminLayout.vue`
- Create: `apps/web/src/components/AppSidebar.vue`
- Create: `apps/web/src/components/StatusBadge.vue`
- Create: `apps/web/src/components/EmptyState.vue`
- Create: `apps/web/src/pages/app/DashboardPage.vue`
- Create: `apps/web/src/pages/app/BillsPage.vue`
- Create: `apps/web/src/pages/app/ComplaintsPage.vue`
- Create: `apps/web/src/pages/app/ActivitiesPage.vue`
- Create: `apps/web/src/pages/app/PatrolPage.vue`
- Create: `apps/web/src/pages/admin/AdminDashboardPage.vue`
- Create: `apps/web/src/pages/admin/AdminContentPage.vue`
- Create: `apps/web/src/pages/admin/AdminFinancePage.vue`
- Create: `apps/web/src/pages/admin/AdminOperationsPage.vue`
- Create: `apps/web/src/pages/portal.test.ts`

- [ ] **Step 1: Write failing role-aware portal tests**

```ts
it('prioritizes obligations and actions on the resident dashboard', async () => {
  const wrapper = mount(DashboardPage, { global: residentGlobal });
  await flushPromises();
  const headings = wrapper.findAll('h2').map((node) => node.text());
  expect(headings.slice(0, 2)).toEqual(['Perlu perhatian', 'Pengumuman penting']);
});

it('does not display admin navigation to a resident', () => {
  const wrapper = mount(AppSidebar, { props: { permissions: ['billing.read'] } });
  expect(wrapper.text()).not.toContain('Kelola warga');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `bun test apps/web/src/pages/portal.test.ts`

Expected: FAIL because resident/admin screens are absent.

- [ ] **Step 3: Implement resident workflows**

Dashboard prioritizes due bills, urgent announcements, personal patrol/activity schedules, open complaints, and pending responses. Provide short forms for payment proof, complaint creation, contribution choice, and patrol swap; show privacy explanations and confirmation before sensitive actions.

- [ ] **Step 4: Implement permission-aware CMS workflows**

CMS provides operational metrics, search/filter/pagination, household CSV import/export, announcement publication, bill/payment verification, finance ledger/reversal/export, complaint assignment/status, activity needs, patrol schedules/swaps, documents, notifications, audit viewer, and settings. Components hide controls without permission while backend remains authoritative.

- [ ] **Step 5: Run portal tests and verify GREEN**

Run: `bun test apps/web/src/pages/portal.test.ts`

Expected: resident and CMS UI tests PASS.

### Task 10: Deployment, backup, operations, and verification

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `docker-compose.yml`
- Create: `infra/caddy/Caddyfile`
- Create: `scripts/backup.sh`
- Create: `scripts/restore.sh`
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/adr-001-modular-monolith.md`
- Create: `docs/deployment/self-hosting.md`
- Create: `docs/deployment/backup-restore.md`
- Create: `docs/api/README.md`
- Create: `playwright.config.ts`
- Create: `tests/e2e/critical-flows.spec.ts`

- [ ] **Step 1: Add container and proxy configuration**

Compose includes `web`, `api`, `worker`, `postgres`, and `caddy`, with health checks, named volumes, non-root containers, secret environment variables, and no Redis. Caddy terminates HTTPS and routes `/api/*` plus `/documentation/*` to the API.

- [ ] **Step 2: Add backup and restore scripts**

Backup uses `pg_dump --format=custom`, archives uploads, writes SHA-256 checksums, and accepts an explicit destination directory. Restore requires explicit database URL, dump path, and upload archive; it never deletes an unspecified directory.

- [ ] **Step 3: Add critical E2E behavior**

```ts
test('resident submits payment and treasurer verifies it', async ({ browser }) => {
  const resident = await browser.newContext();
  const treasurer = await browser.newContext();
  await login(resident, 'warga@demo.local', 'WargaHub123!');
  await resident.pages()[0].getByRole('link', { name: 'Tagihan' }).click();
  await resident.pages()[0].getByRole('button', { name: 'Kirim bukti' }).first().click();
  await treasurer.newPage();
  await login(treasurer, 'bendahara@demo.local', 'WargaHub123!');
  await treasurer.pages()[0].getByRole('button', { name: 'Verifikasi pembayaran' }).first().click();
  await expect(resident.pages()[0].getByText('Lunas')).toBeVisible();
});
```

- [ ] **Step 4: Run repository verification**

Run: `bun run typecheck`

Expected: exit 0 with no TypeScript errors.

Run: `bun run test`

Expected: all unit and integration tests PASS.

Run: `bun run build`

Expected: API and production PWA bundles build successfully.

- [ ] **Step 5: Inspect the running product**

Run: `bun run dev`

Expected: public site at `http://localhost:5173`, API health at `http://localhost:3000/health`, and OpenAPI at `http://localhost:3000/documentation`.

Verify at mobile and desktop widths: no horizontal overflow, keyboard-visible focus, public data is sanitized, resident/admin routes enforce auth, forms show clear errors, and critical empty/loading/error states render.

## Self-review against PRD

- MVP 29.1 items 1–18 map to Tasks 2–10.
- Acceptance criteria for authentication, announcement, billing, finance, complaints, patrol, activities, and public page each have a test-first task.
- FR-010 voting and FR-011 letters intentionally follow the explicit post-MVP boundary in section 29.2.
- Security coverage includes Argon2id, opaque sessions, rate limits, upload validation, IDOR policies, permission checks, audit, immutable finance, and private projections.
- Privacy coverage explicitly prevents public arrears, resident records, reporter identity, proof files, and raw account data.
- Operations coverage includes migrations, health/readiness, worker jobs, Docker Compose, OpenAPI, backups, restore docs, CI, and demo seed.
- No feature implements social ranking, surveillance, real-time chat, payment gateway, WhatsApp, or other excluded scope.
