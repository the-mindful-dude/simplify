# T-P002C — Data, navigation, tooling and baseline (READ-ONLY)

Agent: explore | Status: complete | Scope: data access, shell/nav, auth, scripts/config, baseline evidence
No files changed by the research agent. No build/test/install commands run. Historical gate results below are NOT freshly re-verified.

## Data access (observed)

- apps/web/lib/registry-data.ts:190-273 getRegistrySnapshot() is the single web data entry: cwd walk (:43-59), RegistryClient({registryRoot}) (:192), getRegistryIndex (:196), validateRegistryIndex (:205-213), per-version manifest validation with traversal guards (:24-25,62-77,136-187), errors mapped to RegistryDataError codes (:27-36,159-184).
- apps/web/lib/catalog.ts:29-46,142-196 holds hardcoded display constants (CATEGORY_ORDER, CATEGORY_LABELS, SORT_LABELS) and pure filterAndSortAssets; lib/types.ts:1-142 view types; status-data.ts:10-56 and status-model.ts:1-71 nine-state presentation model.
- apps/web/components/registry-content.tsx:11-37 async server component passes full snapshot to header/hero/status/browser/footer.
- apps/web/components/registry-browser.tsx:1-3,90-102,142-207,235-307 is the only client data consumer (useState filters, useMemo filter/sort, Radix DropdownMenu + Tabs).
- packages/registry/src/client/index.ts:46-238 is a concrete node:fs RegistryClient; path safety at :28-34,220-237. No searchAssets method anywhere (grep: no matches).
- No web repository interface, no web fixtures/mock arrays; test-only mocks at packages/registry/test/client.test.ts:1-3,21-143 and CLI fake clients (source-installer.test.ts:29).
- No @tanstack/*, react-query, swr, apollo, zustand, redux in manifests, lockfile or source (grep: no matches).
- GitHub-side ports exist (packages/github/src/ports.ts:3,34,48,62,76-89; memory.ts:8) but are server integration ports, not web repositories.

## Navigation / shell (observed absences)

- apps/web/app/ contains only page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx. No (dashboard), login, register, nested layouts.
- apps/web/app/layout.tsx:22-30: theme + tokenCss only; no providers, shell, notification host.
- apps/web/components/site-header.tsx:11-52: sticky header with 4 in-page anchors (#browse, #status, #libraries, #sources), responsive hiddenBelow; no nav config/groups/dynamic items.
- Search for sidebar|command.?palette|cmdk|breadcrumb|toast|sonner|notification in apps/ → 1 match: globals.css:54 z-index token on skip link. No toast implementation.
- No createContext/Provider in apps/web. UI has only optional TooltipProvider (Tooltip.tsx:12-21,38-59).
- packages/ui capability inventory: DropdownMenu supports groups/submenus/radio/checkbox/shortcut/destructive (DropdownMenu.tsx:12-30,55-73,75-170,172-226; exports index.ts:74-95); Tabs (Tabs.tsx:12-66; exports 110-116); SplitView (19-96, no collapse controller); Dialog (could host mobile nav); responsive visibility flags (internal/responsive.ts:45-61,84-96). Absent from index.ts:1-118: Sidebar, NavigationMenu, Breadcrumb, CommandMenu/CommandPalette, ContextMenu, Drawer, Toast/Toaster, Popover, Scroll Area. TODO.md:750,756,759 unchecked for Popover/Scroll Area/Drawer.

## Auth (observed)

- Repo-wide grep for clerk|next-auth|auth0|@auth/|firebase|supabase|passport|lucia: no matches.
- Only GitHub App auth files: packages/github/src/oauth.ts, auth.ts; deps @octokit/auth-app, @octokit/oauth-methods (package.json:24-25).
- No middleware/proxy, no end-user login/register/session/protected routes. Auth UI is not even a visual placeholder today. Phase 8 blocked (TODO.md:412-414).

## Tooling / exact commands

- Root scripts package.json:11-30: build=turbo run build; dev=turbo run dev; lint=turbo run lint; typecheck=turbo run typecheck; test=vitest run --config vitest.shared.ts && turbo run test; format:check=prettier --check .; format=prettier --write .; plus changeset/release/clean/docker/webhook scripts.
- Historically executed full gate: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` (TODO.md:24, ledger:695,698-700,707-708, report T-038-final.md:12-17).
- CI .github/workflows/ci.yml:26-53: pnpm 9.15.9, Node 20.19.0, pnpm install --frozen-lockfile, then five gates; Docker build job :55-74. Dockerfile:3,32 Node 20.19.0.
- vitest.shared.ts:12-26 (jsdom only for packages/ui; passWithNoTests true). eslint.config.mjs:26-45. .prettierrc.json:1-7. turbo.json:3-25 (lint/typecheck/test depend on ^build).
- Per-package: lint=eslint src (web: eslint .); typecheck=tsc --noEmit -p tsconfig.json; test=vitest run --config ../../vitest.shared.ts --passWithNoTests; build=tsc -p tsconfig.json (web: next build; ui: tsc + node scripts/copy-css.mjs).
- Targeted historical: pnpm --filter @simplify-dev/web build; --filter ui test; --filter tooling test; --filter github test; --filter registry-api test; pnpm exec prettier --check <paths>; pnpm dev smoke GET / → 200.

## Historical baseline (not re-run)

- Final 2026-11-22: format exit 0; lint 19/19; typecheck 19/19; test 19/19 (root 9, tokens 6, ui 44, registry 74, tooling 55, cli 205, github 27, registry-api 15); build 11/11; two non-fatal Turbopack dynamic-fs warnings in registry-data.ts; dev GET / → 200, 296KB HTML (ledger:706-712, TODO.md:24, T-038-final.md:10-18).
- Sign-offs: reviewer APPROVE, security APPROVED (3 low local-dev findings), performance APPROVED, UI APPROVED WITH LIMITATIONS (code + DOM markers, no browser/axe), architect ADR-005/006 complete.

## Pre-existing defects relevant to redesign

1. Non-fatal Turbopack dynamic-fs warnings (registry-data.ts:43-59,160); accepted, future hardening (ledger:709,717).
2. Inference (not runtime-reproduced): RegistryClient builds <root>/assets/<category>/<assetId>/@<version>/manifest.json (client/index.ts:57-63) while checked-in registry uses registry/<category>/<name>/@<version>/asset.json and web reads root/<assetId>/@<version>/asset.json (registry-data.ts:72). CLI consumes getAsset/getAssetFile (add.ts:266,391; planner.ts:72,154,177). Needs read-only verification before redesign.
3. Stale React 18/Next 14 in AGENTS.md:90 and technical-standards.md:17-18 vs ADR-001:3,28-37 and apps/web/package.json:20-22.
4. ADR-005/006 exist in .agents/decisions/ but not docs/architecture/ (glob only ADR-001..004); ledger:681-684 claims doc sync done.
5. Phase 8 blocked: no GitHub App credentials (TODO.md:412-414).
6. Low local-dev security residuals: no webhook timeout/concurrency cap, unvalidated WEBHOOK_SENDER_MODULE, unbounded tunnel log buffer (T-034b-security.md:9-37).
7. UI verification limitation: no browser screenshot/axe/Lighthouse/screen-reader pass (ledger:716).
8. Performance observations: full snapshot passed to client, sequential manifest reads (registry-data.ts:228-252), no search debounce (registry-browser.tsx:143-152), no measurement script.

## Decisions needed (from this research)

TanStack Query dependency approval; repository-contract ownership (modules/registry vs apps/registry-api confirmed distinct); registry path mismatch remediation; auth placeholder route shape; dynamic menu/workspace data source; notification mechanism; docs/ADR corrections; fresh baseline run.
