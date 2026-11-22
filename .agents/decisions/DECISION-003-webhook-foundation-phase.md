# DECISION-003 — Next phase: credential-free webhook foundation + Cloudflare tunnel

Date: 2026-11-21
Status: Accepted (user-approved via clarification tool)

## User decisions

1. **Next phase scope** = Webhook foundation + local tunnel, not full Phase 8 and not Phase 10.
   Build the credential-free local webhook receiver foundation: webhook-only config path,
   atomic idempotency, event dispatch, HTTP-level tests, and a local signed-request helper.
   Full GitHub App auth/repository creation/publishing remains blocked and out of scope.
2. **Tunnel provider** = Cloudflare Tunnel (`cloudflared` quick tunnel). No account required;
   binary is fetched only when the developer starts the local harness and is never committed.
3. **Secrets** = No GitHub credentials are available. Build and test with a local
   `GITHUB_APP_WEBHOOK_SECRET` fixture. The user explicitly asked that `.env.example` enumerate
   every required secret/token and explain what to place in `.env.local`.
4. **ui-ux-designer focus** = Status UI design (webhook/sync/GitHub connection/library management)
   plus resolution of documented UI residuals.

## Supersession

DECISION-002 limited foundation changes to `.github/workflows/ci.yml`, `Dockerfile`, and
`.github/dependabot.yml` and explicitly excluded scripts, compose, `.env.example`, and docs.
This decision **supersedes** that limitation for this phase only. Newly authorized foundation
paths: root `package.json` scripts, `.env.example`, new env templates, `docker-compose.yml`,
`apps/registry-api/package.json`, and local dev scripts. Documentation still belongs to
`documenter`; `foundation` does not edit `docs/**`, `AGENTS.md`, or `TODO.md`.

## Verified basis

- Branch `feat/ui-foundation-hardening`, HEAD `b63b1b9`, clean working tree.
- Baseline gates all pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build` (19/19 lint, 19/19 typecheck, 19/19 test, 11/11 build).
- `POST /webhooks/github` exists at `apps/registry-api/src/server.ts:58-92` (plain Node http).
- Signature verification exists at `packages/github/src/webhooks/signature.ts:3-23`.
- Idempotency is an in-memory `Map` with non-atomic `has()`/`record()`
  (`packages/github/src/memory.ts:32-46`, `packages/github/src/ports.ts:70-82`,
  `packages/github/src/webhooks/handler.ts:42-49,93-98`).
- `loadGitHubAppConfig` requires all five GitHub App variables
  (`packages/github/src/config.ts:12-18,31-38`), so webhook-only local delivery returns 500.
- `docker-compose.yml:43-48` passes only `GITHUB_APP_WEBHOOK_SECRET` to `registry-api`.
- No tunnel configuration or local webhook guide exists anywhere in the repository.
- Repository lifecycle and installation events only record an `action` string
  (`packages/github/src/webhooks/handler.ts:83-91`); no dispatch occurs.

## Rejected approaches

- Full Phase 8: rejected — no GitHub App credentials; would be a stubbed/fake implementation.
- ngrok/localtunnel: rejected — require an account or are less reliable; Cloudflare quick tunnel
  better matches the "no account, minimal network/data" constraint.
- Running or downloading a tunnel during implementation: rejected — would consume network data
  without producing committed value; the harness fetches it only on developer demand.

## Residual risk

Local webhook testing exercises signed payloads and fixture events, not real GitHub delivery.
Real webhook configuration still requires the user to create a GitHub App and populate `.env.local`.
