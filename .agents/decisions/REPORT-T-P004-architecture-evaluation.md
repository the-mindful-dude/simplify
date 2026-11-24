# Architecture review — T-P004

status: needs_review
scope: Frontend foundation redesign evaluation — module topology, dependency direction, data boundary, shell/sidebar ownership, design-system evolution, defect impact, migration/rollback. Lease: `.agents/decisions/**` only; no source/test/config/docs edits; no commits/pushes.
verdict: The redesign is architecturally sound only as a bounded additive restructuring (three modules now, six deferred), with one canonical registry layout and mechanical boundary/control gates; sign-off is APPROVE_WITH_CONDITIONS and three documentation/enforcement conditions remain open.

## Observed structure

- `AGENTS.md:80-105` — locked decisions; `:90` still says React 18.x / Next.js 14.x.
- `AGENTS.md:109-176` — intended dependency direction; no cycles, no GitHub concepts in registry, no web internals in CLI.
- `AGENTS.md:178-220` — module responsibility rules; single owner, minimal public interface.
- `AGENTS.md:352-383` — intended layout; no empty packages.
- `docs/MODEL.md:285-303,1043-1151` — registry browser and discovery model; web consumes registry data.
- `docs/architecture/ADR-001-next16-react19-upgrade.md:3,28-37` — accepted Next 16.4.6 / React 19 baseline.
- `docs/architecture/technical-standards.md:17-18` — stale React 18 / Next 14; `:127` mandates boundary/export checks that do not exist.
- `docs/architecture/ADR-003-canonical-tokens-and-ui-contracts.md:30,33-45,81` — tokens canonical, `packages/ui` single home, missing hex gate.
- `.agents/decisions/DECISION-FE-FOUNDATION-001.md:1-25` — user-approved 7-phase redesign, four library approvals, modules requirement, addenda.
- `.agents/decisions/DECISION-004-boundary-conflicts.md:17-27` — earlier "no modules/*" decision, superseded for this scope by ADR-007.
- `.agents/reports/T-P002A-frontend-architecture.md:17,29` — current import graph; no modules, no repository, duplicate FS reader.
- `.agents/reports/T-P002B-design-system.md:7,20-22` — tokens healthy; Sidebar/ContextMenu/CommandPalette/Breadcrumb/ScrollArea absent.
- `.agents/reports/T-P002C-data-nav-tooling.md:18-22,37-49` — no shell/palette/toast/providers; historical gates; perf and security residuals.
- `pnpm-workspace.yaml:1-4` — only `apps/*`, `packages/*`, `schemas`; no `modules/*`.
- `eslint.config.mjs:26-45` — only type-import/any/internal-import rules; no JSX intrinsic or hex enforcement.
- `test/workspace.test.ts:3-11` — deep imports bypass package exports.
- `apps/web/lib/registry-data.ts:43-59,62-77,136-187,190-273` — server-side FS reader and snapshot builder in the web app.
- `apps/web/components/registry-browser.tsx:90-108,142-207,235-307` — client filter/sort/detail state co-located with presentation.
- `apps/web/app/layout.tsx:18-31`, `apps/web/components/site-header.tsx:11-52` — header-only global nav; no shell/sidebar.
- `packages/registry/src/client/index.ts:28-34,53-70` — traversal guard and `assets/<category>/<assetId>/@v/manifest.json` path builder.
- `registry/index.json:6`, `git ls-files registry` — checked-in layout `registry/<category>/<name>/@1.0.0/asset.json` (no `assets/`, no `manifest.json`).
- `packages/registry/test/client.test.ts:118-133` — test bakes in doubled `assets/ui/ui/button/@1.0.0/manifest.json`.
- `packages/tooling/test/library-builder.test.ts:23-25,66,106` — third layout `assets/ui/button/manifest.json` without version.
- `apps/registry-api/package.json:26-28`, `apps/registry-api/src/app.ts:3-9,97-160` — Node webhook receiver depending only on `@simplify-dev/github`.
- `packages/blocks/package.json:27-30` — React 18 peers against accepted React 19 baseline.
- `packages/ui/src/index.ts:1-118`, `packages/ui/package.json:23-35` — 17 exports, six Radix deps, React 19 peers, no styles export.
- `packages/tokens/src/source/tokens.json:29-36,70-78` — radius lacks `card`/`dialog`; motion tokens present.

## Findings

- [blocker] Three competing registry artifact layouts and two manifest filenames — evidence: `registry-data.ts:72` vs `client/index.ts:57-63` vs `library-builder.test.ts:23-25`; `client.test.ts:118` enshrines doubled category — required change: ADR-012 resolver in `@simplify-dev/registry`, one adapter in `modules/registry`, read-only verification before changing client, staged web shim.
- [critical] No mechanical boundary enforcement — evidence: `eslint.config.mjs:26-45`, `test/workspace.test.ts:3-11`, `technical-standards.md:127` expectation — required change: package.json-edge checker, export-only imports, no deep paths, per ADR-007/014.
- [critical] App shell/nav would be duplicated without an owner — evidence: `layout.tsx:18-31`, `site-header.tsx:11-52`, `registry-browser.tsx:235-289`, missing ui primitives — required change: ADR-013 owners and ADR-014 primitives.
- [major] Framework docs contradict accepted baseline — evidence: `AGENTS.md:90`, `technical-standards.md:17-18` vs `ADR-001:3,28-37` and `apps/web/package.json:20-22` — required change: ADR-015 plus approved doc task; no edit in this lease.
- [major] No native-control enforcement — evidence: `DECISION-FE-FOUNDATION-001.md:21`, `eslint.config.mjs:26-45` — required change: ADR-014 ESLint JSX restriction and additive primitives.
- [major] Blocks peer mismatch — evidence: `packages/blocks/package.json:27-30` vs `ui/package.json:32-35` — required change: separate defect task with lockfile refresh (ADR-002).
- [minor] Missing DOM tests for DropdownMenu/Tooltip/Tabs — evidence: `git ls-files packages/ui` from check 4 — required change: UI test task before gate hard-fail.
- [minor] No hex gate despite ADR-003:81 — evidence: `ADR-003:81`, `eslint.config.mjs:26-45` — required change: include in gate task.
- [minor] Performance observations unverified — evidence: full snapshot to client `registry-data.ts:228-252`, no debounce `registry-browser.tsx:143-152` — required change: measure before optimizing; do not pre-optimize.
- [note] Auth pages must be honest visual placeholders — evidence: `DECISION-FE-FOUNDATION-001.md:12` — required change: no fake auth module; route-only UI with clear behavior.

## Boundary and dependency impact

- Added (planned): `apps/web -> modules/app`; `apps/web -> domain modules`; `modules/registry -> modules/core, @simplify-dev/registry`; `modules/app -> modules/core, @simplify-dev/ui`; `domains -> modules/core` (+ optional read-only `-> modules/registry`).
- Added to packages: `packages/ui -> cmdk` (ADR-011), `packages/ui -> @radix-ui/react-context-menu` (ADR-010); no other third-party UI edge outside `packages/ui`.
- Removed (planned): `apps/web/lib/registry-data.ts -> node:fs` once the server adapter shim is deleted; direct Radix/cmdk imports in pages if any appear.
- Changed: `packages/registry/src/client/index.ts` artifact path resolution (ADR-012).
- Forbidden edges asserted: `packages/* -> modules/*`, `apps/registry-api -> modules/*`, `modules/core -> domains/ui/fs`, `modules/app -> domains`, `domains -> modules/app`, `modules/registry/client -> node:fs`, any module -> `github`/`cli`/`tooling`.
- Cycle check: `core` has no outgoing workspace edges; `registry -> core`; domains -> `core` (+ optional `registry`); `app -> core, ui`; `web -> all`. Acyclic.

## Recommended design

- Three private workspace packages now: `@simplify-dev/module-core`, `@simplify-dev/module-app`, `@simplify-dev/module-registry` (frontend). Defer `dashboard`, `assets`, `collections`, `compositions`, `publishers`, `settings` until their own code exists. Do not create `modules/auth`.
- Direction: `core <- domains <- app <- apps/web`; `packages/*` and `apps/registry-api` never depend on modules.
- `core` owns cross-cutting types/factory only; `registry` owns repository port + on-disk adapter behind `./server`; `app` owns shell/nav/motion/command host; `ui` owns all interactive primitives; pages compose only.
- One registry layout resolver; one QueryClient factory; one nav config; one component vocabulary; one validation path.

## Migration sequence

1. Add workspace pattern `modules/*` to `pnpm-workspace.yaml` and boundary/export/hex/JSX gates in report-only mode (no source behavior change).
2. Create `modules/core` with nav/async/repository types and QueryClient factory; assert no workspace deps.
3. Add missing `packages/ui` primitives with tests and READMEs (ADR-010/011/013/014); keep exports additive.
4. Execute ADR-012 step-1 read-only verification of published artifact layout; then add the resolver in `packages/registry` and correct `RegistryClient` with updated CLI tests.
5. Create `modules/registry` port and server adapter; make `apps/web/lib/registry-data.ts` a thin re-export shim; delete duplicated FS logic in a later commit.
6. Create `modules/app` shell with a parallel route-group layout; move `site-header` nav data into `navConfig`; delete old header links after parity.
7. Add one domain module at a time; each adds its own port/keys/hooks/fixtures and `NavContribution[]` data only.
8. Run full gates after every step; revert the step commit if any gate fails. The shim and parallel layout keep the system working throughout.

## ADRs

- `.agents/decisions/ADR-007-frontend-module-topology.md` — three modules now, six deferred; strict direction; supersedes DECISION-004 §2 for new scope.
- `.agents/decisions/ADR-008-tanstack-query.md` — single cache library; per-request/session QueryClient; domain-owned keys.
- `.agents/decisions/ADR-009-motion-for-react.md` — Motion confined to `modules/app`; CSS/token sidebar motion with reduced motion.
- `.agents/decisions/ADR-010-radix-context-menu.md` — one `ContextMenu` in `packages/ui`; actions defined once in `modules/app`.
- `.agents/decisions/ADR-011-cmdk-command-palette.md` — cmdk behind `packages/ui` `CommandPalette`; commands contributed once from composition root.
- `.agents/decisions/ADR-012-registry-repository-and-artifact-layout.md` — repository port, server-only adapter, one canonical layout resolver, staged CLI/web migration.
- `.agents/decisions/ADR-013-app-shell-and-navigation-ownership.md` — shell/nav policy in `modules/app`; generic primitives in `ui`; pages contribute data only.
- `.agents/decisions/ADR-014-design-system-only-controls.md` — all interactive controls from `@simplify-dev/ui`; ESLint JSX restriction; hex/boundary gates.
- `.agents/decisions/ADR-015-framework-baseline-and-doc-reconciliation.md` — ADR-001 authoritative; stale docs fixed by approved task; blocks peer defect separate.

No ADR was written for routine local changes; all nine are structural (boundaries, dependency direction, public contracts, isolation, tooling enforcement or documented baseline).

## Risks

- Published artifact layout differs from checked-in source — mitigation: ADR-012 read-only verification before client change; versioned layout contract.
- CLI breaks after path fix — mitigation: contract test against real checked-in asset before and after; staged rollback.
- `core` becomes a dumping ground — mitigation: export allowlist, boundary checker, no domain types.
- Modules accidentally published — mitigation: `private: true` and CI assertion.
- SSR cache leakage — mitigation: request-scoped QueryClient (ADR-008).
- `./server` imported into client bundle — mitigation: `server-only` guard plus ESLint rule.
- Duplicate nav/action definitions — mitigation: single `navConfig`, data-only contributions.
- Third-party UI leaks outside `packages/ui` — mitigation: dependency assertion and ADR-014 lint rule.
- Stale docs mislead implementers — mitigation: ADR-015 condition C4 and coordinator tracking.

## Open questions

- Exact 7-phase titles/acceptance criteria are not in the repository — matters because T-P005 must own the implementation plan; user-provided guide is the only source.
- Which layout is canonical for *published* artifacts — matters because ADR-012 must not enshrine the wrong path; needs read-only verification.
- Notification/Toast mechanism was not approved (token exists at `tokens.json:86`, no implementation) — matters because it could introduce another dependency; requires decision before implementation.
- Workspace persistence mechanism and privacy posture — matters because `useSidebarState` needs an injected port, not an ambient global.
- Whether client refetch requires a new route handler/server action — matters because it adds an HTTP surface; must reuse the same repository if introduced.
- Precise behavior of "honest placeholder submission" for visual-only auth — matters to avoid fake functionality.
- Final transcription/numbering of ADR-005…015 into `docs/architecture/` — matters because README status table is stale and ledger claims sync.

## Checks run (read-only)

- `git status --short --branch && echo "---BRANCH---" && git branch --show-current && echo "---LOG---" && git log --oneline -10` → branch `feat/ui-foundation-hardening`; `M .agents/ledger.yaml`; four untracked `.agents` files; log head `65fb13a`.
- `git ls-files registry` → 15 tracked files, all `registry/<category>/<name>/@1.0.0/asset.json`; no `assets/`, no `manifest.json`.
- `git ls-files modules; echo "exit:$?"` → `exit:0`, no modules tracked.
- `git ls-files packages/ui` → full list; no tests for `DropdownMenu`, `Tooltip`, `Tabs`.
- No builds/tests/installs/lint/typecheck commands were run, per scope. Tool reads of missing root `tsconfig.json` and wrong `packages/ui/src/components/Button.tsx` path returned "File not found"; correct paths used subsequently.

## Note on report location

The architect output contract specifies `.agents/reports/T-P004-architecture-evaluation.md`, but the active user permission rule denies edits outside `.agents/decisions/**`. The full analysis is therefore written to `.agents/decisions/REPORT-T-P004-architecture-evaluation.md`; the user-facing structured report was delivered in chat as instructed.

## Verification criteria for follow-up

- Boundary checker reports zero forbidden edges from §Boundary and dependency impact.
- One resolver implementation; zero `assets/<category>/<assetId>` path builders outside `packages/registry`.
- `server-only` import assertion passes for `module-registry/server`.
- Lint rule rejects a `<select>` fixture in `apps/web` and accepts semantic elements inside `packages/ui/src/**`.
- Palette/sidebar DOM tests cover keyboard, focus return and reduced motion.
- Fresh baseline gates pass after doc/defect tasks: format, lint, typecheck, test, build.
