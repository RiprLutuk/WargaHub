# Wide Layout Shells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the wider, denser layout the default across public pages, the resident portal, and the admin CMS while preserving responsive behavior.

**Architecture:** Increase the shared content token and base `.container` width, then add bounded content wrappers inside authenticated layouts so sidebars remain stable while page content uses the available viewport. Public pages with custom shells inherit the same max width rather than defining isolated widths.

**Tech Stack:** Vue 3, Vue Router, scoped CSS, Vite, vue-tsc, Playwright screenshots.

---

### Task 1: Establish shared wide content tokens

**Files:**
- Modify: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/src/styles/base.css`

- [x] Increase `--content` from `74rem` to `92rem` and keep mobile gutters unchanged.
- [x] Ensure `.container` uses the shared token and does not introduce horizontal overflow.
- [x] Run `bun run --cwd apps/web typecheck` and `git diff --check`.

### Task 2: Align public page shells

**Files:**
- Modify: `apps/web/src/pages/public/PublicBusinessesPage.vue`
- Modify: `apps/web/src/pages/public/PublicStructurePage.vue`
- Modify: `apps/web/src/pages/public/PublicFacilitiesPage.vue`
- Modify: `apps/web/src/pages/public/PublicComplaintsPage.vue`
- Modify: `apps/web/src/pages/public/PublicProgramsPage.vue`

- [x] Remove page-specific width overrides that conflict with the shared content token.
- [x] Keep 3-column desktop grids flexible, 2-column tablet grids, and 1-column mobile grids.
- [x] Verify representative public routes at desktop and mobile widths.

### Task 3: Expand resident portal content area

**Files:**
- Modify: `apps/web/src/layouts/AppLayout.vue`
- Review: `apps/web/src/pages/app/*.vue`

- [x] Keep the sidebar at 17rem/4.5rem collapsed while allowing `#portal-content` to use the full remaining viewport.
- [x] Align resident page wrappers to `var(--content)`.
- [x] Preserve the fixed mobile navigation and bottom content padding.

### Task 4: Expand admin CMS content area

**Files:**
- Modify: `apps/web/src/layouts/AdminLayout.vue`
- Review: `apps/web/src/pages/admin/*.vue`

- [x] Keep admin navigation stable while making `#admin-content` fill the available viewport.
- [x] Align admin page wrappers to `var(--content)`.
- [x] Verify admin styles compile with the frontend typecheck.

### Task 5: Regression verification

**Files:**
- Test: existing `apps/web/src/**/*.test.ts`

- [x] Run `bun run --cwd apps/web typecheck`.
- [x] Run `bun run --cwd apps/web test -- --run`.
- [x] Run Playwright screenshots for representative public routes.
- [x] Run `git diff --check`; no old 78/86/88rem page wrappers remain.
