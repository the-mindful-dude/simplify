# Security review — T-034b

status: approved
scope: In-scope working tree on `feat/ui-foundation-hardening` (baseline context `b63b1b9`): ADR-006 provenance implementation in `packages/tooling/src/library-builder/**`, `packages/tooling/test/**`, `packages/cli/test/library-build.test.ts`, `packages/tooling/src/index.ts`; webhook/config/API/dev harness in `packages/github/src/**`, `packages/github/test/**`, `apps/registry-api/src/**`, `apps/registry-api/test/**`, `scripts/dev/**`, `.env.example`, `docker-compose.yml`, root/app `package.json`; decisions `.agents/decisions/ADR-005-credential-free-webhook-boundaries.md` and `.agents/decisions/ADR-006-publication-provenance-boundary.md`. Out of scope: UI/blocks/web visual diffs, real GitHub webhook delivery, Phase 8 publishing implementation.
threat model: Assets — GitHub webhook secret and App credentials, local `.env.local`, build metadata/provenance claims, artifact integrity, host filesystem/dev shell, HTTP ingress. Entry points — untrusted `library.json` repository/maintainer fields and env (`GITHUB_SHA`, `GITHUB_ACTOR`, `GITHUB_REPOSITORY`, `GITHUB_ACTIONS`), `.git` metadata, inbound POSTs to `/webhooks/github` via the optional quick tunnel, `WEBHOOK_SENDER_MODULE`, compose interpolation. Trust boundaries — untrusted manifest/env -> local builder; public tunnel -> API handler; dev scripts -> developer shell; local build output -> CLI consumer; local provenance candidate -> future registry publisher. Attacker capabilities — control manifest/env strings, send arbitrary HTTP requests to a manually opened tunnel, set dev env overrides, keep a tunnel running; cannot forge an HMAC without the secret and has no publishing credentials in this phase. Impact if controls fail — false immutable provenance, secret exposure, local DoS, dev-shell code execution, corrupted publication integrity.

## Findings

### [low] Webhook ingress has no request timeout or concurrency cap

- file:line: `apps/registry-api/src/app.ts:59-95`, `apps/registry-api/src/server.ts:8-10`
- attack path or failure: With `pnpm webhook:tunnel` running (`scripts/dev/webhook-tunnel.mjs:21-23`), an unauthenticated client opens many slow/incomplete POSTs to `/webhooks/github`; `collectBody` buffers up to 1 MB per request (`apps/registry-api/src/app.ts:11,65-83`) but has no socket deadline or in-flight limit, so sockets can be held open.
- impact: Local-development availability degradation only; no hosted boundary is approved in this phase.
- preconditions: Public quick tunnel manually opened and discovered, or network access to the bound `0.0.0.0:3002` listener (`apps/registry-api/src/server.ts:13-15`).
- evidence: ADR-005 documents untrusted tunnel ingress and retained size/rate cap (`.agents/decisions/ADR-005-credential-free-webhook-boundaries.md:332-333`) but no timeout; `docs/development/README.md:89-92` warns tunnel requests are untrusted; no `requestTimeout`, `headersTimeout`, or concurrency guard exists in the inspected server code.
- remediation: Before any public/hosted deployment, set `server.requestTimeout`, `server.headersTimeout`, `server.keepAliveTimeout`, and a bounded in-flight request semaphore/backpressure.
- blocks acceptance: no

### [low] WEBHOOK_SENDER_MODULE imports an arbitrary local module in dev tooling

- file:line: `scripts/dev/send-webhook.mjs:8-10,24`, `.env.example:55-58`
- attack path or failure: Anyone able to set `WEBHOOK_SENDER_MODULE` causes `import(pathToFileURL(resolve(value)))` to execute that module's top-level code with the developer's privileges before `main()` is checked (`scripts/dev/send-webhook.mjs:25-28`).
- impact: Local code execution in the dev shell; no privilege escalation because control of the developer environment already implies code execution.
- preconditions: Control of `.env.local` or the shell env used by `pnpm webhook:send` (`package.json`).
- evidence: The override is documented but unvalidated; no repository-root containment or allowlist check exists.
- remediation: Remove the override outside local development or validate that the resolved path remains under the repository and is the expected sender module.
- blocks acceptance: no

### [low] Tunnel log capture grows without bound

- file:line: `scripts/dev/webhook-tunnel.mjs:25-31`
- attack path or failure: `output += text` accumulates all stdout/stderr for the lifetime of `cloudflared`; a long-running or noisy child process grows memory until the dev process is stopped.
- impact: Local dev memory exhaustion.
- preconditions: Long-lived tunnel or high-volume child output.
- evidence: No cap or truncation exists; the URL regex only scans the accumulated string (`scripts/dev/webhook-tunnel.mjs:34`).
- remediation: Cap the buffer (for example retain the last N bytes) or stop accumulating once the public URL is announced.
- blocks acceptance: no

## Controls verified

- Prior T-034 blocker resolved — `ProvenanceCandidate` contains only `source`, `publisher`, `generatedAt`, `artifact` (`packages/tooling/src/library-builder/index.ts:30-50`); the emitted object has no `immutable` or `verified` key (`packages/tooling/src/library-builder/index.ts:452-466`); CLI JSON guard asserts no `"immutable"` string (`packages/cli/test/library-build.test.ts:115-116`); tooling test asserts both keys absent (`packages/tooling/test/library-builder.test.ts:234-247`).
- SHA validation — one validator rejects non-40-hex and all-zero and lowercases output (`packages/tooling/src/library-builder/index.ts:73-75,225-232`), applied to `GITHUB_SHA` and both `.git` HEAD paths (`:235-263`); tests cover wrong length, non-hex, all-zero, uppercase acceptance, and no-`.git` success (`packages/tooling/test/library-builder.test.ts:359-393`).
- Repository identity validation — `github.com` host allowlist and HTTPS/URL hygiene for URL form (`:75-77,123-147`), scp form (`:148-155`), and bare form (`:156-158`); exactly two segments, owner/name regexes, `.`/`..` rejection, normalized `https://github.com/<owner>/<name>` (`:160-172`); negative/positive matrix at `packages/tooling/test/library-builder.test.ts:395-435`.
- Publisher correlation — actor -> maintainer -> owner precedence retained as an attributed claim (`:312-318`); `GITHUB_ACTIONS=true` with mismatched `GITHUB_REPOSITORY` fails (`:334-346`); tests cover mismatch, match, and absent-Actions behavior (`packages/tooling/test/library-builder.test.ts:307-328,437-473`).
- Fail-fast before writes — provenance resolution throws `PublicationProvenanceError` (`:310-346`) before artifact/metadata writes (`:493-507`); tests assert no output file on malformed/missing provenance (`packages/tooling/test/library-builder.test.ts:142-171,175-204,330-357`).
- Local publication validation removed — no `validatePublicationRecord` call or `immutable: true` write remains in `packages/tooling/src` (grep outcome below); validation moved to Phase 8 per ADR-006 (`.agents/decisions/ADR-006-publication-provenance-boundary.md:68-72,152-157`).
- HMAC verification — `timingSafeEqual` with catch-to-false (`packages/github/src/webhooks/signature.ts:16-22`) and verification before payload parse/claim (`packages/github/src/webhooks/handler.ts:52-61`).
- Payload bound — 1 MB cap and pause+reject before further buffering (`apps/registry-api/src/app.ts:11,65-83`); HTTP test at `apps/registry-api/test/server.test.ts:186-204` (prior T-034 verified).
- Atomic idempotency — `claim()` contract forbids interleaving (`packages/github/src/ports.ts:76-89`); in-memory implementation has no await between check and write (`packages/github/src/memory.ts:42-50`); handler claims before dispatch (`packages/github/src/webhooks/handler.ts:61-74`); concurrency test at `packages/github/test/webhook-hardening.test.ts:86-120` (prior T-034 verified).
- Generic client errors — structured `GitHubIntegrationError` codes map to generic wire errors without secret/payload details (`apps/registry-api/src/app.ts:26-42,148-155`); dev helper errors are local-only (`packages/github/src/webhooks/handler.ts:100-107` stores failure text, `apps/registry-api/src/app.ts:139-146` does not return it).
- Secrets and credentials — placeholders only in `.env.example:60-99`; `.env.local`/`.env` ignored (`.gitignore:27-29,47-50`); compose passes `${...}` interpolation only (`docker-compose.yml:48-55`); dev-scripts invocation uses `--env-file=.env.local` (`package.json` scripts, `apps/registry-api/package.json` scripts) with no secret in args or logs.
- Dev signing helper confined — helper lives in `apps/registry-api/src/dev/local-signed-request.ts:32,60` and is used only by `apps/registry-api/src/dev/send-webhook.ts:1-2,116-119` and tests; `packages/github/src/index.ts:1-13` has no local-signed-request export, satisfying ADR-005 (`:208-210`).
- Config and port cleanup — narrow `loadWebhookReceiverConfig` requires only the secret (`packages/github/src/webhooks/webhook-config.ts:15-25`) and is exported (`:8` in `packages/github/src/index.ts`); back-compat aliases are additive (`packages/github/src/config.ts:11-16,36-42`); `has()` removed from the port (`packages/github/src/ports.ts:76-89`); remaining `get()` is an explicitly non-port test helper (`packages/github/src/memory.ts:35-41`).
- Supply chain — no dependency or lockfile change: root/app package diffs only add scripts (`package.json`, `apps/registry-api/package.json`), `pnpm-lock.yaml` is unmodified.

- Read-only commands executed in T-034b and outcomes:
  - `git status --short && git branch --show-current && git rev-parse HEAD && git log --oneline -18` -> branch `feat/ui-foundation-hardening`; many modified/untracked files; baseline context `b63b1b9`; no commits made.
  - `git diff --stat -- .env.example docker-compose.yml apps/registry-api/src/app.ts apps/registry-api/src/server.ts scripts package.json apps/registry-api/package.json` -> 5 files changed, 117 insertions, 107 deletions; `apps/registry-api/src/server.ts` changed, `apps/registry-api/src/app.ts` did not change in this pass.
  - `git diff -- package.json apps/registry-api/package.json` -> only `dev:webhooks`, `webhook:tunnel`, `webhook:send`, and registry-api start/dev scripts changed; no dependency additions; `pnpm-lock.yaml` not modified.
  - `git diff -- packages/github/test/github.test.ts packages/github/test/webhook-hardening.test.ts` -> error assertions now match `{ name: 'GitHubIntegrationError', code }`; no weakening of signature/payload rejection.
  - `git diff -- packages/github/src/config.ts packages/github/src/errors.ts packages/github/src/ports.ts packages/github/src/memory.ts` -> added narrow-config aliases, `payload_too_large` code, atomic `claim()`, removed port `has()`, added event port types.
  - `git diff -- packages/github/src/index.ts packages/tooling/src/index.ts` -> added exports for webhook-config, repository-link-port, `PublicationProvenanceError`, `ProvenanceCandidate`; no dev signing helper export.
  - `grep -RIn 'buildSignedWebhookRequest\\|local-signed-request\\|webhookFixture' packages apps scripts --include=*.ts --include=*.mjs` -> matches only in `apps/registry-api/**` (src/dev, test, dist) and none in `packages/github`.
  - `grep -RIn 'immutable\\|validatePublicationRecord\\|publicationRecord' packages/tooling/src packages/cli/src --include=*.ts` -> only doc comments at `packages/tooling/src/library-builder/index.ts:32-33` and `packages/cli/src/commands/library-init.ts:177`; no code emission.
  - `grep -RIn 'deliveryStore\\.has\\|deliveryStore\\.get\\|\\.has(deliveryId)\\|\\.get(deliveryId)' packages apps --include=*.ts` -> only `packages/github/src/memory.ts:41` test helper and `packages/github/test/webhook-hardening.test.ts:231`; no port `has()` call.
  - `grep -RInE 'requestTimeout|headersTimeout|slowloris|concurrency|WEBHOOK_SENDER_MODULE|output \\+=|log buffer|local-dev|local dev' .agents/decisions docs/development apps/registry-api/src scripts --include=*.md --include=*.ts --include=*.mjs` -> only ADR-005 tunnel notes, `docs/development/README.md:57`, and the three low-finding loci above.
  - `grep -nE 'env|dist|node_modules' .gitignore` -> `node_modules/` at 4, `dist` at 39, `.env*.local` at 28, `.env` at 29/48, `.env.*` at 49, `!.env.example` at 50.
  - `glob("**/ADR-006*")` and `glob(".agents/decisions/*")` -> `No files found`; direct `read` of `.agents/decisions/ADR-006-publication-provenance-boundary.md` succeeded.

## Unverified areas

- Test execution — I did not run `pnpm --filter @simplify-dev/tooling test`, `pnpm --filter @simplify-dev/cli test`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, or full `pnpm test`/`pnpm build`; the user-reported 55-test matrix and CLI guard are supported by source/tests but not independently executed here (ADR-006 gate list at `.agents/decisions/ADR-006-publication-provenance-boundary.md:191-195`).
- Real delivery — no real GitHub App webhook or quick-tunnel round trip was performed; ADR-005 leaves this unverified in the phase (`.agents/decisions/ADR-005-credential-free-webhook-boundaries.md:215-216`, `docs/development/README.md:91-92`).
- Hosted deployment — compose binds `registry-api` to `0.0.0.0:3002` (`docker-compose.yml:41-55`); external TLS, network policy, and rate limiting were not reviewed. Apply the pre-production gates in Finding 1 before exposure.
- Persistent idempotency — only the process-local `InMemoryWebhookDeliveryStore` was reviewed; a distributed adapter with unique-key claiming is required before horizontal scaling (`.agents/decisions/ADR-005-credential-free-webhook-boundaries.md:328-329`).
- Publication minting — no registry-side Phase 8 implementation exists here to verify the four steps in ADR-006 (`:68-72`); evidence of authenticated repository verification, SHA/artifact match, publisher binding, and once-only version write is required before any consumer may trust `immutable`.
- `repositoryId` representation drift (URL vs GitHub node id) remains unresolved by ADR-006 (`:188-189,285-286`); needs an ADR before Phase 8 publishes records.

## Residual risk

- Local provenance can still be forged in a non-Actions build (env and manifest strings are untrusted). Accepted by ADR-006 (`:110-112`); mitigation is the absence of an `immutable`/`verified` claim plus mandatory registry-side verification in Phase 8. Accepted by the architect decision, not by this review alone.
- `GITHUB_REPOSITORY` correlation could create false confidence if treated as authentication. Mitigated by typed `publisher` as an attributed claim and by ADR-006's explicit correlation-only wording (`:99-112,184-185`).
- Process-local claiming and one-shot duplicate behavior remain dev/foundation-only (`.agents/decisions/ADR-005-credential-free-webhook-boundaries.md:328-331`); mitigated for this phase by documented scope and local `failed` status recording (`packages/github/src/webhooks/handler.ts:100-107`).
- The three low dev-tooling findings above are accepted for local development only; each has a named pre-production gate.

## Verdict

Approved. The T-034 block is lifted: the builder no longer emits an unenforceable `immutable` claim, SHA/repository/publisher inputs are validated or explicitly downgraded to attributed claims, and fail-fast behavior prevents malformed provenance from being written. HMAC-before-parse, the 1 MB body cap, atomic claims, and secret handling remain intact. No critical or high findings remain; three low findings are confined to the local-dev tunnel/sender harness and do not block acceptance, but the stated timeouts, sender-path validation, log-buffer cap, test execution evidence, and Phase 8 publishing gates must be completed before any hosted exposure or trusted immutable publication.
