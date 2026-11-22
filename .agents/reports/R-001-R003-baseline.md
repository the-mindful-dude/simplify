# Research + baseline report (R-001 / R-002 / R-003)

Branch: `feat/ui-foundation-hardening`; HEAD `b63b1b9`; clean tree at research time.
Research agents were `explore`, strictly READ-ONLY; they made no edits. Coordinator ran baseline gates.

## Baseline (coordinator-executed, exact commands and outcomes)

- `pnpm format:check` → exit 0, all matched files formatted.
- `pnpm lint` → 19/19 tasks successful (19 cached).
- `pnpm typecheck` → 19/19 tasks successful.
- `pnpm test` → 19/19 tasks; root 9, tokens 6, UI 42, github 17, registry 74, tooling 30, cli 205.
- `pnpm build` → 11/11 tasks successful.

No pre-existing gate failure. All defects below are latent/reproducible defects, not failing gates.

## R-001 — Foundation / toolchain (file:line evidence)

- Root scripts `package.json:11-27`; `.nvmrc:1` = 20.19.0; `pnpm-workspace.yaml:1-7`; `turbo.json:3-24`.
- CI five gates at `.github/workflows/ci.yml:22-53`; Node pinned 20.19.0 at `:34`.
- `.env.example:1-21` is the only env template; declares six `GITHUB_APP_*` vars but no tunnel/callback URL and no per-app template.
- `docker-compose.yml:31-60` `registry-api`; `:43-48` passes only `NODE_ENV`, `PORT`, `HOSTNAME`, `NEXT_TELEMETRY_DISABLED`, `GITHUB_APP_WEBHOOK_SECRET`.
- `packages/github/src/config.ts:12-18,31-38` requires five App variables → compose delivery yields 500 `github_app_not_configured`.
- No `dotenv` dependency; `apps/registry-api/src/server.ts:18,98-101` reads `process.env` directly (Node 20 `--env-file` is the dependency-free fix).
- No tunnel references anywhere in tracked source.
- Stale: `AGENTS.md:88-93` and `docs/architecture/technical-standards.md:17-18` still say React 18/Next 14 while `apps/web/package.json:20-22` pins Next 16.4.6/React 19 and ADR-001 is accepted.
- Stale READMEs: `apps/web/README.md:13-15`, `packages/github/README.md:19-21`, `packages/ui/README.md:11,22-24`.
- `.github/dependabot.yml:10-22` covers npm only (no github-actions ecosystem).

## R-002 — Webhook / GitHub integration (file:line evidence)

- Endpoint `POST /webhooks/github` at `apps/registry-api/src/server.ts:58-92`, plain Node `http`; raw body cap 1,000,000 bytes at `:9,33-48`; response mapping `:65-92`.
- Signature: HMAC-SHA256 `sha256=` at `packages/github/src/webhooks/signature.ts:3-23`; header check at `handler.ts:28-34`.
- Config requires five vars (`config.ts:12-18,31-38`); handler lazily memoized at `server.ts:11,14-22`.
- Delivery store: contract `ports.ts:70-82`; in-memory `Map` `memory.ts:32-46`; non-atomic `has()` at `handler.ts:42-49` and `record()` at `:93-98` (TOCTOU race).
- Events: push `:68-71`; create/release `:72-82`; repository `:83-88` and installation `:89-91` only record `action`, no dispatch. `parseGitHubWebhookEvent` (`events.ts:10-38`) is dead code.
- Errors are plain `Error` with magic strings (`handler.ts:33,39,55`) despite `GitHubIntegrationError` (`errors.ts:1-23`).
- Overflow body `request.destroy()` at `server.ts:41` precedes the 400 response at `:80-82` (possible response loss).
- Tests: only `packages/github/test/github.test.ts` (17 tests); no HTTP-level tests in `apps/registry-api`.
- `packages/tooling/src/library-builder/index.ts:291-305` emits `owner:'unknown'`, `publisher:'unknown'`, zero SHA — provenance defect.

## R-003 — UI foundation and performance (file:line evidence)

- Only authored route is `/` (`apps/web/app/page.tsx:11-38`); no `loading.tsx`/`error.tsx`/`not-found.tsx`.
- Webhook/GitHub/sync UI does not exist in `apps/web`.
- `Suspense` fallback at `page.tsx:31-33` cannot stream because `getRegistrySnapshot()` is awaited at `:12-17`.
- `DataError` renders raw error message at `apps/web/components/data-error.tsx:22-24`.
- `apps/web/lib/registry-data.ts:22-23,55-65,130-133` silently skips invalid manifests.
- `packages/ui/package.json:13-16` packages non-existent `styles` dir; `packages/ui/src/index.ts:118-123` re-exports types from `internal/`; `packages/ui/scripts/copy-css.mjs:24-43` cleans stale CSS only.
- Tokens are canonical (`packages/tokens/src/source/tokens.json:1-95`); no hardcoded brand hex in web/UI CSS; dark-only theme intentional.
- Accessibility patterns present: skip link, landmarks, live status, focus-visible, reduced motion, Dialog/InputField semantics.
- Performance: four client components (`registry-browser`, `asset-card`, `asset-detail`, `library-section`); full snapshot passed into client at `page.tsx:31-33`; sequential manifest reads at `registry-data.ts:195-219`; no debounce/deferred value at `registry-browser.tsx:91-102,143-152`; local diagnostic reports `firstLoadUncompressedJsBytes` 609,447 for `/`; no performance budget or measurement script exists.

## Pre-existing error register (all must be remediated in this phase or explicitly blocked)

1. Webhook-only config impossible (R-002 gap 1) → T-030.
2. Non-atomic dedup TOCTOU (R-002 defect 3) → T-030.
3. Magic-string webhook errors (R-002 defect 2) → T-030.
4. Inert repository/installation event dispatch (R-002 defect 5) → T-030.
5. Oversized-body response loss (R-002 defect 6) → T-030.
6. Dead `parseGitHubWebhookEvent`/dedup `get` (R-002 defect 8) → T-030.
7. No HTTP-level webhook tests (R-002 gap 6) → T-030.
8. No local tunnel/env/signed-sender foundation (R-001 gaps 1-5) → T-029.
9. Compose under-configured (R-001 defect 8) → T-029.
10. API cannot load `.env.local` (R-001 defect 10) → T-029.
11. Dependabot missing github-actions (R-001 defect 13) → T-029.
12. Publication provenance placeholders (R-002 defect 7) → T-031.
13. Stale styles export/packaging (R-003 defect 3) → T-032.
14. Unreachable Suspense skeleton (R-003 defect 6) → T-032.
15. Raw error disclosure (R-003 defect 7) → T-032.
16. Silent manifest skip (R-003 defect 8) → T-032.
17. UI stale-JS cleanup + internal type re-export + contrast advisory (R-003 defects 2,4, ledger residuals) → T-032.
18. Stale docs/READMEs/AGENTS table/TODO (R-001 defects 3-7, R-003 defects 1-2) → T-037.
19. Stale coordinator ledger (R-001 defect 1) → coordinator (updated this phase).
20. No authored loading/error/not-found states (R-003 defect 5) → T-032.
