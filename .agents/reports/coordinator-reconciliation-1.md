# Coordinator reconciliation — Phase: credential-free webhook foundation

## Parallelism outcome

Six tasks dispatched in parallel: T-026 architect, T-027 performance, T-028 ui-ux-designer (read-only), T-029 foundation, T-030 coder, T-031 bugfixer (mutating, disjoint leases).

## T-026 — APPROVED (ADR-005 at `.agents/decisions/ADR-005-credential-free-webhook-boundaries.md`)

- Webhook-only config must be a **separate factory** (`loadWebhookReceiverConfig()`), not an optional mode on `loadGitHubAppConfig`. Full App config stays unchanged.
- Atomic claims belong to the `WebhookDeliveryStore` port as a single `claim()`; handler consumes it. Duplicate stays a 200.
- Dispatch owned by the webhook handler via injected ports; reuse `parseGitHubWebhookEvent` and `GitHubIntegrationError`.
- Tunnel belongs to root dev tooling (`scripts/**`), never runtime code.
- **Conflict flagged:** ADR says compose should keep only `GITHUB_APP_WEBHOOK_SECRET` + document `env_file`; T-029 acceptance required all five via interpolation.

## T-027 — baseline accepted

- `/` first-load uncompressed JS = **609,447 B / 6 chunks** (reproducible from standard Next artifacts, not the untracked diagnostic). `/_not-found` = 457,165 B / 5. Total chunks = 722,041 B / 7. Registry = 18,288 B, 39 assets, 7 libraries.
- Risks: unbounded in-memory delivery Map, 1 MB body × concurrent requests, oversize response loss, HMAC cost on duplicates, no debounce on search, full snapshot to client, sequential manifest reads.
- T-035 needs a tracked webhook load harness (p50/p95/p99, RSS, store size) that does not yet exist.

## T-028 — design APPROVED; one boundary gate needs resolution

- Nine-state status model, token plan (no new tokens/hex; dark-only), WCAG AA live-region/focus/keyboard rules, compose from existing UI primitives (no new `packages/ui` exports).
- Residual table confirmed (11 items, all inside T-032 lease).
- **Boundary gate:** designer's feature-module rule wants `modules/<feature>/package.json`, but no `modules/` exists and T-032's lease has no `modules/**`. Options: (A) co-signed exception to compose in `apps/web/components/**` (recommended, consistent with AGENTS.md §5 and T-017/T-021), or (B) create a new workspace package (lease/workspace/config changes, slower).

## T-029 — foundation completed (8 files, all in lease)

- `.env.example` rewritten with full secret/token documentation; root scripts `dev:webhooks`, `webhook:tunnel`, `webhook:send`; API scripts use `node --env-file`; compose passes all five vars via interpolation + documents `env_file`; Dependabot adds github-actions; `scripts/dev/{start-registry-api,webhook-tunnel,send-webhook}.mjs`.
- No cloudflared download, no secrets, no new deps.
- Cross-dependency: T-030 must export `apps/registry-api/src/dev/send-webhook.ts` → `dist/dev/send-webhook.js` with `main(argv)` and keep `startServer()` exported.

## T-030 — **INCOMPLETE: empty agent result**

- The coder returned an empty message. However, T-029 observed parallel changes referencing `apps/registry-api/src/app.ts`, `loadGitHubWebhookConfig`, `WebhookEventPort`, `payload_too_large`, `packages/github/src/config.ts`, `webhooks/events.ts`, `webhooks/handler.ts`, `packages/github/test/webhook-hardening.test.ts`.
- Must inspect the actual diff and gates; likely needs a follow-up task to finish/verify/fix.

## T-031 — **INCOMPLETE: stopped at reproduction**

- Added 4 failing reproduction tests to `packages/tooling/test/library-builder.test.ts`; **did not apply the fix** to `packages/tooling/src/library-builder/index.ts`. Old zero-SHA test still codifies the bug. Tooling suite now has 4 failing tests.

## Coordinator decisions

1. Compose conflict: keep T-029's five-variable interpolation (it satisfies both the user's "everything in place" and the ledger acceptance) and ask architect to confirm ADR-005 can be amended to allow it as the concrete env_file-equivalent; no rollback.
2. UI boundary: choose option (A) — co-sign exception for `apps/web/components/**`; record decision under `.agents/decisions/`; no lease change. Rationale: AGENTS.md §5 says structure is a responsibility guide, not empty-package mandate; avoids premature package.
3. T-030 and T-031 are not done. Do not mark complete; dispatch bounded follow-up/fix tasks after inspecting the diff and current gate state.
