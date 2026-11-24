# Frontend Foundation & Product-Experience Redesign — Implementation Plan

- Plan ID: `FE-FOUNDATION-2026-11`
- Status: COMPLETE (ready for implementation authorization)
- Owner: coordinator
- Research basis: `.agents/reports/T-P002A-frontend-architecture.md`, `T-P002B-design-system.md`, `T-P002C-data-nav-tooling.md`
- Architecture basis: `.agents/decisions/REPORT-T-P004-architecture-evaluation.md` (APPROVE_WITH_CONDITIONS) and ADR-007…015
- User decisions: `.agents/decisions/DECISION-FE-FOUNDATION-001.md`
- Branch at planning start: `feat/ui-foundation-hardening` @ `65fb13ace853e8ba17f0188d980a6a703dfae945`, clean tree
- Planning-only: this document authorizes no code changes. Implementation requires an explicit go-ahead.

> **CRITICAL NAMING RULE — apply to every task brief.** `modules/registry/` is the **frontend domain module** (repository port, query keys, hooks, view components). It is **not** `apps/registry-api/`, the Node webhook-receiver service (`apps/registry-api/src/app.ts:97-160`, depends only on `@simplify-dev/github` per `apps/registry-api/package.json:26-28`). Never merge, import across, or describe them as the same thing.

---

## 1. Verified current state (evidence, not assumption)

| Area               | Verified fact                                                                                                                                                                    | Evidence                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Routing            | Single-page Next.js registry browser; `app/` has only page/layout/loading/error/not-found                                                                                        | T-P002A §3.2; `apps/web/app/page.tsx:1-17`                     |
| Server data        | `getRegistrySnapshot()` reads on-disk `registry/index.json` with `node:fs`, validates manifests, maps to view types                                                              | `apps/web/lib/registry-data.ts:43-58,190-273`                  |
| Client state       | Filters/sort/detail in one `use client` component via `useState`/`useMemo`                                                                                                       | `apps/web/components/registry-browser.tsx:90-108,235-307`      |
| Modules            | No `modules/` directory; workspace covers `apps/*`, `packages/*`, `schemas` only                                                                                                 | T-P002A §3.4; `pnpm-workspace.yaml:1-4`                        |
| Data cache         | No TanStack Query / SWR / Redux / Zustand anywhere                                                                                                                               | T-P002C §1.1, §2                                               |
| Shell              | No sidebar, command palette, breadcrumbs, toast, app providers; header has 4 in-page anchors only                                                                                | T-P002C §1.2; `apps/web/components/site-header.tsx:11-52`      |
| UI library         | 17 components, Radix-based, CSS Modules, no hardcoded hex; missing Sidebar/ContextMenu/CommandPalette/Breadcrumb/ScrollArea/Drawer/EmptyState/Select; Button has 5 of 7 variants | T-P002B §4, §8                                                 |
| Tokens             | Canonical source → generator → CSS + typed exports; WCAG AA remediated; no card/dialog radius or control-height tokens                                                           | T-P002B §3, §8; `packages/tokens/src/source/tokens.json:29-36` |
| Motion             | CSS-only; motion tokens exist; reduced-motion kill switch exists; no Motion dependency                                                                                           | T-P002B §6; `apps/web/styles/globals.css:82-95`                |
| Auth               | No auth provider, routes, middleware, or visual placeholder                                                                                                                      | T-P002C §1.4                                                   |
| Gates              | Last recorded full run passed (format 0; lint/typecheck/test 19/19; build 11/11) — **historical, not re-run**                                                                    | T-P002C §1.6; `.agents/ledger.yaml:706-712`                    |
| Framework baseline | ADR-001 accepts Next 16.4.6 / React 19; `AGENTS.md:90` and `technical-standards.md:17-18` still claim 18/14                                                                      | ADR-001:3,28-37; ADR-015:12-14                                 |

---

## 2. Goals and non-goals

### Goals

1. Domain-owned frontend modules with mechanically enforced boundaries and one authoritative owner per responsibility.
2. A token-driven monochrome design system with deliberate geometry, interaction states, motion, and zero duplicated controls.
3. A persistent, collapsible, hover-animated sidebar with menu groups, keyboard-accessible context menus, and local workspaces.
4. A premium public landing page and a working Explore/asset-detail experience backed by repository contracts.
5. A navigable dashboard prototype with realistic local fixtures, visually honest auth placeholders, and one app shell.
6. All pre-existing defects discovered during research fixed or explicitly gated with residual risk; fresh baseline established; docs/ADRs synchronized.

### Non-goals

- No real authentication, database, hosted publishing, GitHub App credentials, or Phase 8 work.
- No fake success states: installation and auth are previews with local validation only.
- No new empty packages; domain modules are created only when their own code exists.
- No rewriting of `apps/registry-api`, CLI installation engine, GitHub integration, manifest schemas, or locked runtime/toolchain.
- No Push without explicit user authorization (project AGENTS.md requests pushing; coordinator authority requires explicit approval — this conflict is recorded and unresolved).

---

## 3. Target design

### 3.1 Module topology and dependency direction (ADR-007)

Create **now** as private (`"private": true`) workspace packages:

- `@simplify-dev/module-core`
- `@simplify-dev/module-app`
- `@simplify-dev/module-registry` (frontend — not the API app)

Defer until their own code exists: `module-dashboard`, `module-assets`, `module-collections`, `module-compositions`, `module-publishers`, `module-settings`. Do **not** create `modules/auth` (visual auth pages are route files in `apps/web`).

Strict direction: `core <- domains <- app <- apps/web`.

| From                                          | Allowed to depend on                                                                 | Forbidden                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `module-core`                                 | external types/utilities only                                                        | any module, `node:fs`, `next/*`, React components, domain entities                                                              |
| `module-registry` (and future domains)        | `module-core`, `@simplify-dev/registry`, `@simplify-dev/ui`, `@tanstack/react-query` | `module-app`, other domains' internals, `github`/`cli`/`tooling`                                                                |
| `module-app`                                  | `module-core`, `@simplify-dev/ui`, `motion`, `@tanstack/react-query`                 | any domain module (receives `NavContribution[]`/`Command[]` as data from composition root), `next/*` outside app-shell boundary |
| `apps/web`                                    | `module-app`, domain module public entries, `@simplify-dev/ui`, `next/*`             | deep imports into `internal/`, third-party UI directly                                                                          |
| Existing `packages/*` and `apps/registry-api` | unchanged graph                                                                      | any `modules/*` package                                                                                                         |

Acyclic by construction: `core` has no outgoing workspace edges.

Alternatives rejected (recorded in ADR-007): one `modules/web` god package; all nine modules as empty shells; keeping everything in `apps/web`; putting nav policy in `packages/ui`; domains importing `modules/app`.

### 3.2 Data boundary (ADR-008, ADR-012)

- One `RegistryRepository` port in `module-registry` (client-safe root export): `searchAssets`, `getAsset`, `getLibrary` typed with core `AsyncState`/`RepositoryError`.
- Real on-disk adapter in `module-registry/server` with a `server-only` guard; it calls `@simplify-dev/registry`'s layout resolver + client. No second path builder, no second validator.
- `packages/registry` gains one additive pure resolver `resolveRegistryArtifactPath(root, { assetId, version, kind })`; canonical source layout is `registry/<category>/<name>/@<version>/asset.json`. `RegistryClient`'s doubled `assets/<category>/<assetId>/manifest.json` path (`packages/registry/src/client/index.ts:57-63`) is corrected; `packages/registry/test/client.test.ts:118-133` is updated with justification.
- One `createAppQueryClient()` in `module-core`; `module-app` provides exactly one QueryClient per browser session / per SSR request (never a module-global singleton). Domains own key namespaces (`['registry', ...]`, etc.) and hooks.
- Fixture repositories for dashboard/assets/collections/compositions/publishers/settings are test/dev-only implementations of their own narrow ports; no production import path, no filesystem reads in client bundles.
- `apps/web/lib/registry-data.ts` becomes a thin re-export shim, then is deleted. `lib/catalog.ts` and `lib/types.ts` move into `module-registry` view layer.

### 3.3 Application shell, sidebar and menus (ADR-013, ADR-010, ADR-009)

- `module-app` owns: `AppShell`, `AppSidebar`, `navConfig`, `WorkspaceSwitcher` data contract, `useSidebarState` (storage injected), sidebar action definitions, `CommandPaletteHost`, `AppProviders`, `motionPresets.ts`, reduced-motion hook, breadcrumbs, mobile drawer host.
- `@simplify-dev/ui` owns generic, route-agnostic primitives: `Sidebar`, `Collapsible`, `Breadcrumb`, `ScrollArea`, `Drawer`, `ContextMenu`, `CommandPalette`, `EmptyState`, `Select`, Tooltip, plus Button `icon`/`link` variants.
- Sidebar specifics (user requirements):
  - Collapsible (expanded/collapsed/rail states) with CSS hover animations driven by `--sd-motion-*` tokens and `prefers-reduced-motion`. Motion for React is **not** used for hover/collapse.
  - Declarative nav groups with collapsible sections; active-state transition; keyboard collapse; focus restoration.
  - Context menus on nav items via the single Radix-backed `ui` `ContextMenu`; actions defined once in `module-app` and reused by any overflow menu (shared data, not duplicated JSX).
  - Workspace switcher from local fixtures/persisted preference through an injected storage port; no ambient global.
  - Mobile navigation uses `ui` `Drawer` with focus trap and Escape; no native `<dialog>`/`<details>`.
- `apps/web` composes `AppShell` once in a route-group layout and passes route data. Domains contribute `NavContribution[]` data only; no domain exports sidebar components.

### 3.4 Design system (palette decision: evolve tokens, preserve a11y)

- Keep the canonical `tokens.json` → generator → CSS + typed exports pipeline (ADR-003). Change values in the source and regenerate; never edit generated output directly.
- Map the guide's Obsidian/Graphite/Charcoal/Slate/Silver/Pearl direction into semantic tokens while preserving the already-remediated WCAG AA contrast (`foregroundSubtle #90909a`, `borderStrong #73737d`, destructive/outline fixes from T-019/T-021). Re-run `tokens.test.ts` contrast recomputation after changes.
- Add `--sd-radius-card` (14–18px) and `--sd-radius-dialog` (18–22px) tokens, and control-height tokens for 32/40/48px classes. Standard button/input becomes 40–44px.
- 4px spacing base / 8px layout rhythm; shared geometry tokens; no per-page magic numbers.
- Motion: CSS for hover/collapse/simple states; Motion for React only for orchestrated shell/palette transitions in `module-app` via shared presets + reduced-motion guard.
- Scrollbars: extend current `scrollbar-color: thin` with token-driven WebKit styling in `packages/ui` `ScrollArea`; never hide scrollbars in a way that blocks keyboard scrolling.
- Empty/error/loading states use shared `ui` primitives; domains own state mapping and content.

### 3.5 Approved new dependencies (each needs ratification of ADR-008…011 in Phase 1 doc task)

| Dependency                     | Location                             | ADR     | Constraint                                                                             |
| ------------------------------ | ------------------------------------ | ------- | -------------------------------------------------------------------------------------- |
| `@tanstack/react-query`        | `module-core`, `module-app`, domains | ADR-008 | Single cache library; request-scoped client; domain-owned keys                         |
| `motion` (Motion for React)    | `module-app` only                    | ADR-009 | Orchestrated motion only; CSS for hover/collapse; dynamic import where optional        |
| `@radix-ui/react-context-menu` | `packages/ui`                        | ADR-010 | One exported `ContextMenu`; actions defined once in `module-app`                       |
| `cmdk`                         | `packages/ui`                        | ADR-011 | Behind one `CommandPalette` wrapper composed with Radix Dialog; no direct page imports |

All lockfile updates follow ADR-002 (pnpm primary, package-lock secondary). No dependency enters `apps/registry-api`, `packages/github`, `packages/cli`, or any published package other than `packages/ui`.

---

## 4. Affected paths (exact)

- **Add:** `modules/core/**`, `modules/app/**`, `modules/registry/**`; later `modules/{dashboard,assets,collections,compositions,publishers,settings}/**`.
- **Modify workspace/tooling:** `pnpm-workspace.yaml`, `turbo.json`, root `tsconfig.base.json`, `eslint.config.mjs`, root `package.json` scripts, `.github/workflows/ci.yml`, `vitest.shared.ts`, `package.json`/`tsconfig.json` of new modules.
- **Modify packages:** `packages/registry/src/client/index.ts` (+ additive resolver, tests), `packages/tokens/src/source/tokens.json` (+ regenerate outputs, tests), `packages/ui/**` (new primitives, variants, tests, READMEs, manifest, copy-css script if needed), `packages/blocks/package.json` (React 19 peers).
- **Modify web:** `apps/web/app/**` (route groups, layouts, landing/auth/public/dashboard routes), `apps/web/components/**`, `apps/web/styles/**`, `apps/web/lib/**` (shim then deletion), `apps/web/package.json`, `apps/web/README.md`.
- **Docs/contracts:** `AGENTS.md:90`, `docs/architecture/technical-standards.md:17-18,127`, `docs/architecture/README.md:42-51`, transcribe ADR-005/006/007…015 into `docs/architecture/`, `docs/MODEL.md` where navigation/design rules are stated, `TODO.md` only after verified completion, component READMEs.
- **Tests:** new module tests, UI DOM tests (ContextMenu, CommandPalette, Sidebar, Collapsible, Breadcrumb, Drawer, Select, EmptyState, Button variants, and missing DropdownMenu/Tooltip/Tabs), boundary/export/hex-gate fixture tests, CLI contract test for registry path fix.

---

## 5. Pre-existing defects and remediation mapping

Every item below is an owned, bounded task — not a note to revisit later.

| #   | Defect / evidence                                                                                                                                 | Task                                              | Owner           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------- |
| D1  | Three competing artifact layouts and two manifest filenames (`registry-data.ts:72` vs `client/index.ts:57-63` vs `library-builder.test.ts:23-25`) | F1.0, F1.3                                        | explore → coder |
| D2  | No boundary/export enforcement; `eslint.config.mjs:26-45` vs `technical-standards.md:127`; deep imports in `test/workspace.test.ts:3-11`          | F1.1, F2.4                                        | foundation      |
| D3  | Stale React 18/Next 14 in `AGENTS.md:90`, `technical-standards.md:17-18` vs ADR-001                                                               | F1.5                                              | documenter      |
| D4  | ADR-005/006 not transcribed; `docs/architecture/README.md:42-51` stale; ledger claims sync done                                                   | F1.5                                              | documenter      |
| D5  | `packages/blocks/package.json:27-30` React 18 peers                                                                                               | F1.6                                              | bugfixer        |
| D6  | Stale `apps/web/README.md:3,13-15`, `packages/tokens/README.md:17-19`, ADR-003:17,78 references removed `styles.css`                              | F1.6                                              | documenter      |
| D7  | Non-fatal Turbopack dynamic-fs warnings (`registry-data.ts:43-59`)                                                                                | F7.1                                              | bugfixer        |
| D8  | Missing DOM tests: DropdownMenu, Tooltip, Tabs                                                                                                    | F2.5                                              | bugfixer        |
| D9  | No hex-color gate despite ADR-003:81                                                                                                              | F2.4                                              | foundation      |
| D10 | UI a11y residual: input border contrast advisory, muted/subtle separation                                                                         | F2.5                                              | bugfixer        |
| D11 | No toast/notification implementation (only z-index token `tokens.json:86`)                                                                        | F3.1 (decision point DP1)                         | coder           |
| D12 | Performance observations unverified (full snapshot to client, no debounce, sequential reads)                                                      | F7.3                                              | performance     |
| D13 | Security residuals: webhook timeout/concurrency cap, `WEBHOOK_SENDER_MODULE` validation, tunnel log buffer cap                                    | F7.2 (document pre-hosting gates)                 | security        |
| D14 | No browser/axe visual QA historically (T-036 limitation)                                                                                          | F3.4, F4.4, F5.5, F6.4, F7.5 (decision point DP4) | ui-ux-designer  |
| D15 | Phase 8 intentionally blocked (no credentials)                                                                                                    | Record as accepted residual; out of scope         | coordinator     |

---

## 6. Phase-by-phase implementation tasks

Each task below is a bounded delegation unit. Every agent brief must include: TASK id, OWNER, MODE, LEASE (exact paths), OBJECTIVE, CONTEXT (file:line evidence), IN SCOPE, OUT OF SCOPE, ACCEPTANCE, VERIFICATION, DELIVERABLE, CONSTRAINTS, DEPENDENCIES, PARALLELISM. Subagents never commit or push; the coordinator owns Git.

### Phase 1 — Architecture and boundaries

**F1.0 — Baseline + artifact-layout verification**

- Owner: `explore` (read-only verification) + `coordinator` (baseline run). Lease: NONE.
- Verify read-only which paths `RegistryClient.getAsset`/`getAssetFile` and tooling builder actually resolve for a checked-in asset (`registry/ui/button/@1.0.0/asset.json`), and record exact commands/outputs before any code change. Coordinator then runs `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` and `git status --short --branch`, recording exact results as the fresh baseline.
- Acceptance: canonical published-layout question answered with evidence; fresh baseline recorded; all pre-existing failures listed as F-tasks above.
- Verification: exact commands above; no emit-file commands in the explore portion.

**F1.1 — Workspace wiring and mechanical boundary gates (report-only)**

- Owner: `foundation`. Lease: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, root `package.json`, `eslint.config.mjs`, `.github/workflows/ci.yml`, `scripts/**` (new boundary checker), new module `package.json`/`tsconfig.json` scaffolds.
- Add `modules/*` workspace pattern; private module manifests with `"."` exports and `"./server"` for registry; tsconfig paths; boundary/export checker (forbidden edges §3.1, no deep imports, no `packages/*` → modules, no `apps/registry-api` → modules); ESLint internal-import + JSX-intrinsic + third-party-UI-import + hex gates in **report-only** mode.
- Acceptance: checker reports zero current forbidden edges; gates run without failing the build; CI includes them in report-only mode; module manifests are all `private: true`.
- Verification: `pnpm --filter ... typecheck`; run checker script; `pnpm format:check && pnpm lint`.

**F1.2 — `modules/core` contracts**

- Owner: `coder`. Lease: `modules/core/**`. Depends: F1.1.
- Implement `AsyncState<T>`, `RepositoryError`, `APP_ROUTES`, navigation/workspace types, `createAppQueryClient()` with explicit `staleTime`/`gcTime`, minimal fixture helper only if ≥2 proven consumers. No I/O, no React components, no `next/*`, no domain entities. Export allowlist only.
- Acceptance: tests prove pure contracts and distinct QueryClient instances; boundary checker shows no outgoing workspace edge; no `node:fs`/`next/*` in source.
- Verification: `pnpm --filter @simplify-dev/module-core test|typecheck|lint`; boundary checker.

**F1.3 — Registry artifact resolver and client fix**

- Owner: `coder`. Lease: `packages/registry/**`. Depends: F1.0.
- Add the additive pure layout resolver + contract tests; switch `RegistryClient` off the doubled path; update `client.test.ts:118-133` with a clear justification; add CLI consumption test against a real checked-in asset. Support both source and published layouts during migration with a versioned contract.
- Acceptance: CLI and web resolve the same checked-in asset; zero `join(..., 'assets', ...)` builders outside `packages/registry`; all registry + CLI tests pass.
- Verification: `pnpm --filter @simplify-dev/registry test`, `pnpm --filter @simplify-dev/cli test`, `pnpm typecheck`.

**F1.4 — `modules/registry` frontend module**

- Owner: `coder`. Lease: `modules/registry/**`, `apps/web/lib/registry-data.ts`, `apps/web/lib/catalog.ts`, `apps/web/lib/types.ts`. Depends: F1.2, F1.3.
- Repository port, `./server` adapter with `server-only` guard, query keys/hooks/mutations, view mappers, loading/error/empty mapping. `registry-data.ts` becomes a thin re-export shim; catalog/types move into the module; no new FS logic in web.
- Acceptance: only `module-registry/server` reads the filesystem on the web path; `server-only` import assertion passes; existing page still renders identical data; no duplicated validation.
- Verification: module tests, web build, `pnpm --filter @simplify-dev/web build`, boundary checker.

**F1.5 — Architecture/ADR/doc reconciliation (ADR-015 condition C4)**

- Owner: `documenter`. Lease: `AGENTS.md`, `docs/architecture/**`, `docs/MODEL.md`, `README.md`, `.agents/decisions/**` status updates only. Depends: F1.1.
- Correct framework baseline to Next 16/React 19; transcribe ADR-005/006/007…015 with accurate statuses (ratify ADR-007…015 as Accepted once user authorizes implementation); update README ADR table; document module conventions, repository contract, no-native-controls rule, sidebar/menu ownership, and registry artifact layout.
- Acceptance: zero `React 18.x`/`Next.js 14.x` claims in `AGENTS.md` and `technical-standards.md`; ADR index lists 001…015; every new module has a documented public API and forbidden edge.
- Verification: `pnpm format:check`; cross-check each claim against code; reviewer spot-check.

**F1.6 — Remaining scaffolding defects**

- Owner: `bugfixer` (peer fix) + `documenter` (READMEs) — split into two disjoint leases. Depends: F1.5 for doc text.
- `packages/blocks/package.json` React 19 peers + lockfile refresh per ADR-002; stale READMEs (`apps/web/README.md`, `packages/tokens/README.md`, ADR-003 removed `styles.css` reference); remove unused `@simplify-dev/blocks` dependency from `apps/web` if confirmed unused.
- Acceptance: zero React 18 peers; all READMEs describe actual behavior; install/build gates pass.

_Parallelism in Phase 1:_ F1.2, F1.3, F1.5, F1.6 have disjoint paths and can run concurrently after F1.0/F1.1. F1.4 depends on F1.2 + F1.3.

### Phase 2 — Design system foundation

**F2.1 — Design spec and visual standard**

- Owner: `ui-ux-designer` (design authority; returns spec, coordinator records under `.agents/reports/`). Depends: F1.5.
- Specify palette mapping, semantic token table, spacing/radius/height scale, button/input/card/dialog geometry, interaction-state matrix (default/hover/focus-visible/active/disabled/loading/error), motion standards with reduced-motion, scrollbar treatment, empty-state rules, responsive breakpoints, and sidebar visual/interaction spec (hover, collapse, groups, context menu, workspaces).
- Acceptance: spec approved with explicit token names; every requested visual rule maps to a token or primitive; accessibility criteria stated measurably.

**F2.2 — Token evolution**

- Owner: `coder`. Lease: `packages/tokens/**`. Depends: F2.1.
- Update canonical source (palette mapping, `--sd-radius-card`, `--sd-radius-dialog`, control-height tokens, any needed letter-spacing token), regenerate outputs, update parity/contrast tests.
- Acceptance: `tokens.test.ts` parity + WCAG AA recomputation pass; no hex outside source/generated; tokenCss consumed unchanged by web.

**F2.3 — UI primitives and variants**

- Owner: `coder`. Lease: `packages/ui/**`, `packages/ui/package.json`, lockfiles. Depends: F2.1, F2.2.
- Add `ContextMenu` (ADR-010), `CommandPalette` (ADR-011), `Sidebar`, `Collapsible`, `Breadcrumb`, `ScrollArea`, `Drawer`, `EmptyState`, `Select`, Button `icon`/`link`, token-driven WebKit scrollbar styling; add cmdk + Radix Context Menu deps; each primitive gets export, CSS Module, DOM tests, README; keep existing APIs additive.
- Acceptance: all primitives exported once from `packages/ui/src/index.ts`; tests cover keyboard, focus return, reduced motion; no third-party UI import outside `packages/ui/src/**`; no hardcoded hex.
- Verification: `pnpm --filter @simplify-dev/ui test|build|lint|typecheck`; hex gate.

**F2.4 — Mechanical gates → hard fail**

- Owner: `foundation`. Lease: `eslint.config.mjs`, `scripts/**`, `.github/workflows/ci.yml`, `test/**` fixture tests. Depends: F2.3 (primitives must exist before hard fail).
- Enable boundary/export, JSX-intrinsic restriction (apps/web + modules, exempt `packages/ui/src/**`), third-party UI import restriction, and hex gate as hard CI failures; fix `test/workspace.test.ts:3-11` deep imports.
- Acceptance: a fixture containing `<select>` in `apps/web` fails lint; the same element inside `packages/ui/src/**` passes; boundary checker exits non-zero on a forbidden edge; zero deep imports.

**F2.5 — UI defect sweep**

- Owner: `bugfixer`. Lease: `apps/web/components/**`, `apps/web/styles/**`, `packages/ui/src/overlays/**`, `packages/ui/src/primitives/InputField/**`. Depends: F2.3.
- Add missing DOM tests for DropdownMenu/Tooltip/Tabs; replace restricted intrinsics in existing web markup with design-system primitives; fix input-border contrast advisory and muted/subtle separation from T-021.
- Acceptance: zero restricted intrinsics in `apps/web`; three missing test files exist; contrast recompute passes; no weakened assertions.

**F2.6 — Design sign-off**

- Owner: `ui-ux-designer`. Lease: NONE (review). Depends: F2.2–F2.5.
- Review token spec compliance, geometry, interaction states, keyboard/focus/reduced motion. Explicit APPROVE / APPROVED_WITH_NOTES / REQUEST_CHANGES.

_Parallelism:_ F2.2 and F2.3 are sequential (spec → tokens → components). F2.4 and F2.5 can overlap once F2.3 lands (disjoint gate vs component paths), but F2.4 hard-fail enablement must be last.

### Phase 3 — Application shell

**F3.1 — `modules/app` shell**

- Owner: `coder`. Lease: `modules/app/**`. Depends: F1.2, F2.3, F2.6.
- Implement `AppShell`, `AppSidebar` (collapsible + CSS hover animations + groups + context menus via `ui` primitive + workspace switcher with injected storage), `navConfig`, `useSidebarState`, `AppProviders` (single scoped QueryClient + theme + notification host), breadcrumbs, `CommandPaletteHost`, mobile Drawer host, `motionPresets` + reduced-motion guard, sidebar action data (one definition set). Notification host uses a token-based `ui` Toast/announcer with no new dependency unless DP1 resolves otherwise.
- Acceptance: one `navConfig`; zero Sidebar/WorkspaceSwitcher/ContextMenu action definitions outside `module-app` and `packages/ui`; keyboard collapse, context-menu focus return, reduced-motion, and mobile focus trap tests pass; CSS-only hover/collapse; Motion only via shared presets.

**F3.2 — Route composition and parallel run**

- Owner: `coder`. Lease: `apps/web/app/**`, `apps/web/components/site-header.tsx`, `apps/web/package.json`. Depends: F3.1, F1.4.
- Compose `AppShell` in a new route-group layout while keeping the existing page live; pass route data and contributions once; move header nav data into `navConfig`; delete old header links only after parity.
- Acceptance: both old and new layouts render; no duplicate nav state; existing registry page behavior unchanged; web build passes.

**F3.3 — Command registry from real data**

- Owner: `coder`. Lease: `apps/web/app/**` composition root only, `modules/app/src/commands/**`. Depends: F3.2, F1.4.
- Build `Command[]` from `navConfig` + registry query hooks in the composition root; pass to `CommandPaletteHost`; Cmd/Ctrl+K opens palette; no hardcoded command array in production.
- Acceptance: palette results come from repository-backed hooks; focus/escape/reduced-motion tests pass; no `modules/app → domain` edge.

**F3.4 — Shell visual/accessibility review**

- Owner: `ui-ux-designer`. Lease: NONE. Depends: F3.3.
- Verify desktop/tablet/mobile, hover animation quality, collapsed rail, context-menu keyboard behavior, focus management, reduced motion, no native controls. Requires browser-based inspection with recorded screenshots (DP4).

### Phase 4 — Landing page

**F4.1 — Landing design spec**

- Owner: `ui-ux-designer`. Depends: F2.6. Editorial, not generic SaaS-card layout; sections per guide (nav, hero, interactive product preview, asset ecosystem, compositions, CLI install, GitHub source of truth, publishing/ecosystem, final CTA, footer). No native controls.

**F4.2 — Landing implementation**

- Owner: `coder`. Lease: `apps/web/app/page.tsx`, `apps/web/components/landing/**`, `apps/web/styles/landing/**`. Depends: F4.1, F3.2.
- Build all sections using design-system primitives and real registry preview data; links to Explore, Docs, login/register. Acceptance: every section present; no restricted intrinsics; responsive; visual parity to spec.

**F4.3 — Visual-only auth pages**

- Owner: `coder`. Lease: `apps/web/app/(auth)/**`. Depends: F4.2.
- `/login`, `/register`, `/forgot-password` with `ui` InputField/Button, local validation, and disabled/explicitly non-functional submission with honest copy ("authentication is not connected"). Acceptance: no fake success, no auth dependency, keyboard/aria validated.

**F4.4 — Landing visual QA**

- Owner: `ui-ux-designer`. Desktop/tablet/mobile screenshots, typography, spacing, overflow, keyboard nav; explicit sign-off.

### Phase 5 — Registry experience

**F5.1 — Explore and asset detail**

- Owner: `coder`. Lease: `modules/registry/**` (pages/components/queries), `apps/web/app/(public)/explore/**`, `apps/web/app/(public)/assets/[slug]/**`. Depends: F1.4, F3.2.
- `RegistryPage` (search, category filters, sort, pagination, empty/error/loading), `RegistryDetailPage` (preview, docs, versions, dependencies, compatibility, install instructions, source link). All data from repository hooks; no hardcoded arrays in pages.
- Acceptance: search/filters/detail work against local repository; query keys domain-owned; states use `ui` primitives; no duplicated filter logic from old `registry-browser.tsx`.

**F5.2 — Collections and compositions modules**

- Owner: `coder`. Lease: `modules/collections/**`, `modules/compositions/**`, `apps/web/app/(public)/collections/[slug]/**`, `apps/web/app/(public)/compositions/[slug]/**`. Depends: F1.2, F2.6. Disjoint from F5.1 — parallelizable.
- Real code (ports, fixture repos, queries, detail views); read-only dependency on `module-registry` view primitives allowed and recorded in boundary check. No empty modules.
- Acceptance: detail pages render fixture data; module boundaries pass checker; `NavContribution[]`/commands contributed as data.

**F5.3 — Installation preview**

- Owner: `coder`. Lease: `modules/registry/src/components/installation/**`. Depends: F5.1.
- Honest CLI instructions and simulated preview; clearly labeled as simulation; no claim of installation success.
- Acceptance: no fake success state; content sourced from manifest data; a11y verified.

**F5.4 — Registry visual/accessibility QA**

- Owner: `ui-ux-designer`. Desktop/tablet/mobile, states, keyboard focus, empty/error, no native controls; sign-off.

### Phase 6 — Dashboard experience

**F6.1 — Dashboard and supporting domain modules**

- Owner: `coder`. Lease: `modules/dashboard/**`, `modules/assets/**`, `modules/publishers/**`, `modules/settings/**`. Depends: F1.2, F2.6. Four disjoint sub-leases; can run in parallel with separate agents if desired.
- Each module owns its API types/fixtures/queries/hooks/components/pages per the module convention; settings persists local preferences through an injected port; no filesystem in client bundles.
- Acceptance: no empty exports; each module has real implementation + tests; boundary checker clean.

**F6.2 — Dashboard routes**

- Owner: `coder`. Lease: `apps/web/app/(dashboard)/**`. Depends: F6.1, F3.2.
- Routes: `/dashboard` overview, `/dashboard/library`, `/dashboard/collections`, `/dashboard/compositions`, `/dashboard/publishers`, `/dashboard/analytics` (clearly marked estimated/unavailable where no data), `/dashboard/settings`; consistent `AppShell`, breadcrumbs, context-aware headers, content width, excellent empty states that explain purpose and offer Explore CTA.
- Acceptance: all routes navigable from sidebar; no per-page layout inventions; no native controls; local fixtures only; honest unavailable states.

**F6.3 — Dashboard visual/accessibility QA**

- Owner: `ui-ux-designer`. Screenshots for each major page at 3 breakpoints; keyboard and focus audit; empty-state review; sign-off.

### Phase 7 — Integration and quality

**F7.1 — Residual defect closure**

- Owner: `bugfixer`. Lease: targeted files recorded by earlier tasks. Fix Turbopack dynamic-fs warning hardening and any gate failures from integrated phases; no weakened tests or suppressed diagnostics.

**F7.2 — Security review**

- Owner: `security`. Lease: NONE. Review new surfaces: injected storage/workspace persistence, route handlers/server actions (if any), server-only boundary, third-party UI dependencies/supply chain, no secrets, no native-control-injected HTML, fixture leak to production. Record pre-hosting gates D13. Explicit sign-off.

**F7.3 — Performance measurement**

- Owner: `performance`. Lease: NONE. Compare fresh baseline (F1.0) with post-change using same commands; measure bundle impact of Query/Motion/cmdk; verify no unbounded cache growth, no snapshot over-fetch regression; explicit sign-off or required remediation.

**F7.4 — Independent review**

- Owner: `reviewer`. Lease: NONE. Inspect actual diff across all phases for lease violations, duplicated logic/components, forbidden imports, weakened tests, acceptance gaps, regressions. Explicit APPROVE / REQUEST_CHANGES with file:line evidence.

**F7.5 — Final visual/a11y sign-off**

- Owner: `ui-ux-designer`. Lease: NONE. Confirm each major page reviewed at desktop/tablet/mobile with recorded screenshots; accessibility audit results; motion quality; explicit status including limitations.

**F7.6 — Final documentation sync**

- Owner: `documenter`. Lease: `AGENTS.md`, `TODO.md`, `docs/**`, READMEs. Update only after verified completion; record actual status including blocked Phase 8 and residual risks.

**F7.7 — Coordinator integration and delivery**

- Owner: `coordinator`. Inspect every diff, verify leases and acceptance, run full gates (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`), re-check `git status --short --branch`, commit each coherent task (focused messages), record commit hashes in ledger, report honestly. Push only with explicit user authorization.

---

## 7. Parallelism and sequencing summary

- **Parallel immediately after F1.1:** F1.2 (core), F1.3 (registry client fix), F1.5 (docs), F1.6 (defects) — disjoint paths.
- **F1.4** waits for F1.2 + F1.3. **Phase 2** waits for ADR ratification and design spec; F2.2 → F2.3 → hard-fail gates F2.4; F2.5 overlaps F2.4 carefully.
- **Phase 3** waits for Phase 2 UI primitives + module core. **Phase 4** waits for shell + design spec. **Phase 5** F5.1 and F5.2 are disjoint and parallelizable. **Phase 6** four modules are disjoint sub-leases. **Phase 7** sign-offs are parallel read-only reviews except F7.1 → gates and F7.6 → F7.7.
- Never parallelize two agents on the same file/schema/public contract. Never run a mutating task without a recorded lease in `.agents/ownership.yaml` and `.agents/ledger.yaml`.

---

## 8. Ownership map to install before implementation

| Path                                                                                          | Owner                              |
| --------------------------------------------------------------------------------------------- | ---------------------------------- |
| `modules/core/**`                                                                             | coder                              |
| `modules/app/**`                                                                              | coder                              |
| `modules/registry/**`                                                                         | coder                              |
| `modules/{dashboard,assets,collections,compositions,publishers,settings}/**`                  | coder (one lease per module)       |
| `packages/tokens/**`                                                                          | coder                              |
| `packages/ui/**`                                                                              | coder (then ui-ux-designer review) |
| `packages/registry/**`                                                                        | coder                              |
| `packages/blocks/package.json`, lockfiles                                                     | bugfixer / foundation              |
| `apps/web/app/**`, `apps/web/components/**`, `apps/web/styles/**`, `apps/web/lib/**`          | coder                              |
| `eslint.config.mjs`, `scripts/**`, `turbo.json`, `pnpm-workspace.yaml`, CI                    | foundation                         |
| `AGENTS.md`, `TODO.md`, `docs/**`, READMEs                                                    | documenter                         |
| `.agents/decisions/**`, `.agents/reports/**`, `.agents/ledger.yaml`, `.agents/ownership.yaml` | coordinator                        |

---

## 9. Validation and quality gates

**Full gate (run by coordinator at baseline and final):**

```
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

**Targeted gates:** `pnpm --filter @simplify-dev/<pkg> test|build|lint|typecheck`; `pnpm --filter @simplify-dev/web build`; `pnpm dev` smoke `GET /` → 200.

**Additional required checks:**

- Boundary checker: zero forbidden edges; no cycles; no `packages/*`/`apps/registry-api` → `modules/*`.
- Export checker: no deep imports into `internal/`, no bare `src/index.js` imports.
- `server-only` assertion for `module-registry/server`.
- Lint fixture: `<select>` in apps/web fails; inside `packages/ui/src/**` passes.
- Hex gate: zero hex literals outside token source/generated output.
- UI DOM tests: keyboard, focus return, reduced motion for every new interactive primitive; DropdownMenu/Tooltip/Tabs gaps closed.
- Token parity + WCAG AA recompute.
- Browser visual QA with recorded screenshots for each major page (DP4).

No check may be silently skipped. If a check cannot run, record it as a verification limitation and keep the affected task incomplete.

---

## 10. Migration, compatibility, security, performance, rollback

- **Migration:** workspace pattern + report-only gates → core → registry client fix → registry module with web shim → app shell parallel route → domain modules one at a time → delete shims after parity. Each step leaves the app buildable.
- **Compatibility:** existing published package APIs remain additive-only; `apps/registry-api` graph unchanged; ADR-001 baseline authoritative; dual lockfiles per ADR-002; visual auth pages never claim real authentication.
- **Security:** server-only guard; injected storage (no ambient global); no secrets; no arbitrary script execution; third-party UI confined to `packages/ui`; fixtures never imported in production; no native HTML injection via controls; pre-hosting gates D13 documented.
- **Performance:** no module-global QueryClient; explicit stale/gc defaults; measure before optimizing; dynamic-import orchestrated Motion; verify no snapshot over-fetch regression; performance sign-off required.
- **Rollback:** revert the single step commit. Additive resolver, additive UI exports, thin web shim, and parallel route layout are specifically chosen so each step is independently reversible. Never amend/force-push shared history.

---

## 11. Risks, assumptions, decision points, unresolved questions

**Risks:** published artifact layout differs from checked-in source (mitigate F1.0); CLI breaks after path fix (contract tests + staged rollback); `core` becomes dumping ground (export allowlist + boundary check); modules accidentally published (`private: true` + CI assertion); SSR cache leakage (per-request client + test); `server-only` imported into client bundle (guard + lint); duplicate nav/action definitions (single config + review); Motion/UI library leakage (dependency assertions); stale docs mislead agents (F1.5).

**Decision points to resolve before the named task starts (recommended defaults):**

- **DP1 (F3.1):** Notification/Toast mechanism. Default: token-based `ui` Toast + live-region announcer, no new dependency.
- **DP2 (F3.1):** Workspace persistence. Default: injected storage port backed by localStorage with fixture fallback; no server, no account linkage.
- **DP3 (F4.3):** Honest auth placeholder behavior. Default: local field validation; submit disabled with explicit "authentication not connected" copy; no success state.
- **DP4 (F3.4/F4.4/F5.4/F6.4/F7.5):** Visual QA tooling. Default: browser-based manual inspection with recorded screenshots; automated visual regression requires a separate tooling decision (no Playwright approved).
- **DP5 (F1.3):** Canonical published artifact layout — resolved by F1.0 evidence; resolver supports source + published layouts during migration.
- **DP6 (F1.5):** ADR-007…015 are currently `proposed`; ratify as `Accepted` only with implementation authorization.

**Unresolved from architect:** exact route-handler/server-action need for client refetch (avoid a second data implementation if introduced); final ADR numbering/transcription. These are resolved in F1.5/F3.3 and must not be guessed during implementation.

---

## 12. Definition of done and commit expectations

A phase is DONE only when: every F-task acceptance criterion is verified with recorded evidence; all gates pass; required design/security/architecture/review sign-offs are recorded; docs and ADRs match code; no discovered defect remains unowned or unapproved; diffs are inspected and within lease; and changes are committed with focused messages and hashes recorded in `.agents/ledger.yaml`. `TODO.md` is updated only after verified completion. Push only with explicit user authorization; if authorized and it fails, preserve the commit and report the exact error.

**Definition of fully complete (all 7 phases):** one enforced module architecture; redesigned token-driven UI with no duplicated controls; collapsible hover-animated sidebar with groups/context menus/workspaces; premium landing page; working Explore/asset-detail and dashboard prototypes on repository contracts; visual-only auth; all remediation tasks closed; fresh gates pass; final Git state clean with commits recorded.
