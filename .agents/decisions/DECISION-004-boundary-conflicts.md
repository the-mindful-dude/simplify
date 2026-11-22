# DECISION-004 — Resolution of two phase-boundary conflicts

Date: 2026-11-21

## 1. Compose environment configuration (ADR-005 vs T-029)

**Decision:** Keep T-029's implementation — `docker-compose.yml` passes all five
`GITHUB_APP_*` variables via interpolation, and `.env.example` documents the `env_file`
alternative. ADR-005 must be amended to state that interpolation from host environment /
`.env.local` is the concrete equivalent of the recommended `env_file` pattern, provided no
secret value is committed. Architect co-sign requested in T-026b.

Rationale: satisfies the ledger acceptance criterion literally, gives the user one predictable
place to configure secrets, and does not weaken the webhook-only path (the webhook-only config
factory in T-030 validates only `GITHUB_APP_WEBHOOK_SECRET`).

## 2. UI status-view module boundary (T-028 gate)

**Decision:** Option A — compose status views in `apps/web/components/**` using existing
`packages/ui` primitives. No new `modules/*` workspace package is created.

Rationale: `AGENTS.md` §5 states the directory layout is a responsibility guide, not a mandate
to create empty packages; `AGENTS.md` §4.2 forbids creating packages merely to organize files;
the status views are application-owned presentation with no independent reuse boundary; prior
sign-offs T-017/T-021 approved the same app-local composition pattern. The designer's generic
feature-module rule is therefore explicitly excepted for this phase. Architect co-sign
requested in T-026b. No lease change: T-032 already owns `apps/web/**` and `packages/ui/**`.

## 3. Incomplete implementation tasks

T-030 returned an empty report but produced a substantial, passing diff (github 28 tests,
registry-api 13 tests). T-031 produced only failing reproduction tests. Both remain
`in_progress`; bounded follow-ups were dispatched. Neither is marked complete without
verified acceptance and gates.
