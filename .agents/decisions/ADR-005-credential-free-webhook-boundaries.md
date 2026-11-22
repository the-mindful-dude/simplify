# ADR-005 — Credential-free webhook foundation: config, atomic claiming, dispatch, and tunnel boundaries

- Status: accepted (architect sign-off on boundaries; T-026b co-signs both DECISION-004 resolutions)
- Date: 2026-11-21 (amended 2026-11-21 under T-026b)
- Owners: architect
- Related tasks: T-026, T-026b, T-029, T-030, T-032, T-034, T-037

## Coordinator resolutions (T-026b co-sign)

The two statements below are the authoritative architect resolution of the conflicts recorded in
`.agents/decisions/DECISION-004-boundary-conflicts.md:5-27`. Where earlier text in this ADR
contradicts them, this section controls; the affected earlier notes are marked resolved below.

### Resolution 1 — Compose environment interpolation (DECISION-004 §1)

**SIGN-OFF 1 (exact):** "The architect accepts Docker Compose interpolation of all five
`GITHUB_APP_*` variables from the host environment / root `.env.local` as the concrete
implementation of the `env_file` pattern recommended in ADR-005, provided no secret value is
committed. `docker-compose.yml:51-55` contains only `${...}` references and
`.env.example:95-99` documents the dedicated `env_file` alternative; `.env.local` is ignored
(`.gitignore:28-29,47-50`). This satisfies the T-029 acceptance criterion at
`.agents/ledger.yaml:426` without weakening the webhook-only path: the narrow
`loadWebhookReceiverConfig` factory validates only `GITHUB_APP_WEBHOOK_SECRET`, and empty values
for the other four variables do not block signed webhook delivery. The earlier ADR-005 note that
compose must remain webhook-secret-only is withdrawn."

### Resolution 2 — App-local UI status composition (DECISION-004 §2)

**SIGN-OFF 2 (exact):** "The architect co-signs Option A: status views for webhook/sync/GitHub
connection/library management are composed in `apps/web/components/**` from existing
`packages/ui` primitives. No `modules/*` workspace package is created, and no lease change is
required (T-032 already owns `apps/web/**` and `packages/ui/**`). Rationale: `AGENTS.md:180,379-383`
makes the directory layout a responsibility guide rather than an empty-package mandate and forbids
packages created merely to organize files; these views are application-owned presentation with no
independent reuse boundary, and prior sign-offs T-017/T-021 approved the same app-local composition
pattern. The designer's generic feature-module rule is explicitly excepted for this phase. This
exception adds no edge from `packages/github`, `apps/registry-api`, or `packages/registry` to
`apps/web`; it uses only the existing `apps/web` → `packages/ui` dependency (`AGENTS.md:117-122`),
and status data must still cross the registry-api boundary rather than importing GitHub internals
into the web app."

## Context

### Scope and authority

This ADR records the boundary/public-contract decision requested by T-026 and authorized by
`DECISION-003-webhook-foundation-phase.md:8-13` (credential-free webhook foundation + Cloudflare
quick tunnel; full GitHub App auth remains blocked). It is a **read-only architectural review**:
no source, config, test, manifest, documentation, or ledger file was modified. Per the T-026
lease (`.agents/decisions/**`), the architecture-review findings normally written to
`.agents/reports/<task-id>.md` are recorded inline in §"Architecture review (sign-off)" below.

Observed workspace state: branch `feat/ui-foundation-hardening`, `HEAD b63b1b9`. The tracked tree
matches the task context, but it is **not clean in the strict git sense**: `.agents/ledger.yaml`
is modified and `DECISION-003-webhook-foundation-phase.md` / `R-001-R003-baseline.md` are
untracked coordinator artifacts. All differences are confined to `.agents/**`, which is
coordinator-owned (`.agents/README.md:8-9`); no project source/config was changed by this review.

### Observed structure (verified facts)

- `apps/registry-api/src/server.ts:58-92` is the sole webhook endpoint (`POST /webhooks/github`);
  the handler is lazily memoized at `server.ts:11-22`; the port/host come from env at
  `server.ts:98-101`.
- `server.ts:18` calls `loadGitHubAppConfig(process.env)`, which requires all five App variables
  (`packages/github/src/config.ts:12-18,31-38`); with only the webhook secret set, delivery 500s
  with `github_app_not_configured` (`server.ts:84-87`). The comment at `server.ts:16-17` states
  the intent to start with only the secret, but the code does not implement it.
- `createGitHubAppClient` requires the complete `GitHubAppConfig` and uses `appId`/`privateKey`
  (`packages/github/src/auth.ts:4,40-49`). Authenticated App actions therefore genuinely need
  five credentials; webhook signature verification does not.
- Idempotency is split across two non-atomic operations: `WebhookDeliveryStore.has()` then
  `record()` (`packages/github/src/ports.ts:78-82`, `packages/github/src/memory.ts:32-45`,
  `packages/github/src/webhooks/handler.ts:42-49,93-98`). Concurrent deliveries can both pass
  `has()` and both be processed (TOCTOU).
- `packages/github/src/webhooks/events.ts:10-38` already implements structured payload/header
  parsing with `GitHubIntegrationError('payload_invalid')`, but is unused; `handler.ts:28-40,51-56`
  duplicates that parsing with magic-string `Error`s. The error codes for `signature_invalid`,
  `payload_invalid`, `delivery_duplicate`, and `unsupported_event` already exist
  (`packages/github/src/errors.ts:1-13`).
- `handler.ts:83-91` records only an `action` for `repository` / `installation` events; the
  comment at `handler.ts:85-88` delegates repository lifecycle to a connection service but invokes
  nothing. No dispatch occurs.
- Signature verification is already correct and isolated: HMAC-SHA256 with `timingSafeEqual`
  (`packages/github/src/webhooks/signature.ts:3-23`), called before parsing/claiming at
  `handler.ts:31-34`. `computeWebhookSignature` (`signature.ts:3-5`) is reusable by a local sender.
- `server.ts:74-90` maps errors by string message and code; `collectBody` destroys the socket
  at `server.ts:41` before a 400 can be sent at `server.ts:80-82`.
- At T-026 review time `docker-compose.yml:43-48` passed only `GITHUB_APP_WEBHOOK_SECRET` to
  `registry-api` and `.env.example:12-18` enumerated the six `GITHUB_APP_*` variables; no tunnel
  references existed in tracked source and no `scripts/` directory existed yet. **Superseded by
  T-029:** `docker-compose.yml:51-55` now interpolates all five variables from the host
  environment / `.env.local` with no committed values, and `.env.example:95-99` documents the
  `env_file` alternative (accepted in Coordinator resolution 1 above).
- Dependency direction is currently correct: `packages/github/package.json:23-28` depends only on
  Octokit and `@simplify-dev/schemas`; `apps/registry-api/package.json:26-28` depends only on
  `@simplify-dev/github`; `packages/registry` has no GitHub dependency (only a boundary statement
  at `packages/registry/README.md:13-15` and URL-valued test fixtures at
  `packages/registry/test/validation.test.ts:180,211`). Core registry contracts are unaffected.

## Decision

### 1. Webhook-only configuration MUST be a separate factory (recommended and adopted)

Add a narrow, additive public contract in `packages/github` — a dedicated
`packages/github/src/webhooks/webhook-config.ts` exporting:

```ts
export interface WebhookReceiverConfig {
  readonly webhookSecret: string;
}
export function loadWebhookReceiverConfig(env?: NodeJS.ProcessEnv): WebhookReceiverConfig;
```

It validates **only** `GITHUB_APP_WEBHOOK_SECRET` and throws
`GitHubIntegrationError('config_missing')` when absent. Keep `GitHubAppConfig` and
`loadGitHubAppConfig` **unchanged** (`config.ts:5-12,45-68`). `apps/registry-api/src/server.ts:18`
switches to the narrow factory; `createGitHubAppClient(config: GitHubAppConfig)`
(`auth.ts:40-49`) remains the only consumer of full App credentials.
Implementation note (T-026c): the canonical module is
`packages/github/src/webhooks/webhook-config.ts`, while `config.ts` retains the
backward-compatible aliases `GitHubWebhookConfig` and `loadGitHubWebhookConfig`
(`config.ts:14-18,39-43`) and `index.ts:2,8` re-exports both; no public signature changed.

Why a separate factory, not an optional mode on `loadGitHubAppConfig`:

- **Type integrity.** A mode returning `GitHubAppConfig | WebhookReceiverConfig` (or making five
  fields optional) removes the guarantee `auth.ts:40-49` relies on. Every authenticated call site
  would need narrowing or unsafe casts, spreading webhook-only optionality into unrelated auth,
  OAuth, repository, and metadata code. The two capabilities have different credential
  requirements and different consumers; conflating them creates one authoritative config with two
  incompatible meanings.
- **Boundary clarity.** HMAC verification (`signature.ts:7-23`) and Octokit App authentication
  (`auth.ts:1,40-49`) are distinct implementation boundaries. Separate factories let each own one
  reason to change and one validation policy (§4.2, §5 of `AGENTS.md`).
- **Least privilege.** Webhook-only local delivery must never construct an App client or require
  a private key; a mode flag on the full loader keeps the privileged path reachable by default.
- **Minimal change.** A new type + factory is additive and touches one new file plus one exported
  entry in `packages/github/src/index.ts:1-11`; no existing public signature changes.

Rejected: reading `process.env.GITHUB_APP_WEBHOOK_SECRET` directly in `server.ts` (duplicates
validation, loses structured errors); passing five placeholder App variables through compose
(fake configuration, violates least privilege and "no fake implementations").

### 2. Atomic delivery claiming is owned by the `WebhookDeliveryStore` port

The **store**, not the handler, owns delivery-claim semantics. Replace the two-step
`has()` + `record()` (`ports.ts:78-82`) with one linearizable operation:

```ts
export interface WebhookDeliveryStore {
  /** Atomically reserve an id; returns false if it was already claimed. */
  claim(deliveryId: string): Promise<boolean>;
  /** Finalize a previously claimed delivery. */
  record(record: WebhookDeliveryRecord): Promise<void>;
}
```

Contract requirements:

- `claim` must be atomic/linearizable. For the in-memory implementation (`memory.ts:32-46`) this
  means a synchronous check-and-set with **no `await` between** the membership test and insert;
  for any future persistent implementation it means a unique-key insert (`ON CONFLICT DO NOTHING`
  / equivalent) whose affected-row count decides the boolean. The port contract must state this
  so a future adapter cannot silently reintroduce TOCTOU.
- Extend `WebhookDeliveryRecord.status` with a claimed/in-flight state, or keep a separate claim
  marker; `record()` finalizes to `'processed' | 'failed'` (`ports.ts:70-76`).
- **One-shot claim policy for this phase:** after a claim, downstream failure is recorded as
  `'failed'` but the id is **not released**. Retries receive the existing `duplicate` 200 result
  (`handler.ts:43-48`, `server.ts:65-72`). Do not convert duplicates to non-2xx — GitHub treats
  non-2xx as failed delivery and retries. Releasing claims on failure requires a separate ADR and
  idempotent downstream handlers first.
- Remove unused `get()` (`ports.ts:81`, `memory.ts:43-45`) from the public port (dead code, R-002).

`packages/github/src/webhooks/handler.ts` becomes a **consumer** of the port: `claim()` replaces
`has()` at `handler.ts:42`; `record()` at `handler.ts:93-98` becomes finalize only. The handler
must not implement its own check-and-set. It must also call `parseGitHubWebhookEvent`
(`events.ts:10-38`) at the boundary instead of duplicating header/JSON parsing
(`handler.ts:28-40,51-56`), and throw only `GitHubIntegrationError` codes (`errors.ts:1-13`).
`server.ts:74-90` must map by `error.code`, and `server.ts:41` must send the 400 before tearing
down the socket.

### 3. Event dispatch is owned by the webhook handler; side effects stay injected

`handler.ts:83-91` is the correct place to route `repository` / `installation` /
`installation_repositories` events to **declared, injected handlers** (an explicit option on
`GitHubWebhookHandlerOptions`, `handler.ts:5-9`). Dispatch policy (which event maps to which
handler) lives in `packages/github/src/webhooks/`; concrete side effects (repository-link writes)
remain owned by the `RepositoryLinkStore` port (`ports.ts:62-68`) and the connection service
referenced at `handler.ts:85-88`. Dependencies point inward: handler → injected port/callback;
never handler → Octokit, API app, or web internals. If routing logic grows, add a sibling
`webhooks/dispatch.ts`; do not add a package or a service locator.

### 4. Cloudflare Tunnel boundary is owned by root developer tooling, not by a package or the API

The tunnel harness belongs to the **root toolchain / local-dev surface**: `scripts/**` plus root
`package.json` scripts (T-029 lease), configured through `.env.example` and `docker-compose.yml`.
At T-026 review time no `scripts/` directory existed; T-029 has since created `scripts/dev/**`
(`webhook-tunnel.mjs`, `send-webhook.mjs`, `start-registry-api.mjs`). That is a bounded dev-tooling
addition, not a package or a reorganization.

- `cloudflared` quick tunnel is an **external ingress transport** that forwards to
  `127.0.0.1:${PORT||3002}` (`server.ts:58,98`). It is not an authentication boundary and not a
  runtime dependency: no tunnel env var, URL, or cloudflared reference may appear in
  `apps/registry-api/src/**` or `packages/github/src/**`.
- All tunnel-originated requests are untrusted until `verifyWebhookSignature` succeeds
  (`handler.ts:31-34`, `signature.ts:7-23`). The existing "verify before parse/claim" ordering is
  mandatory and must be preserved.
- The local signed-request helper reuses `computeWebhookSignature` (`signature.ts:3-5`); it must
  never reimplement HMAC. It is a dev/test artifact in `apps/registry-api/test/**` (T-030) or a
  thin `scripts/**` wrapper (T-029), never part of `packages/github/dist` or the API runtime.
- No binary or secret is downloaded/committed during implementation (`DECISION-003:12-13,51-52`).
  Any fetched binary must be written to an already-ignored path (`node_modules/.cache/...`,
  covered by `.gitignore:4`) or the OS temp dir — **not** into `scripts/**`, which is not ignored
  (`.gitignore:4,27-29,47-50`). Otherwise the T-029 lease must be extended to `.gitignore`.
- The tunnel URL is ephemeral; wiring it into a GitHub App is a manual, out-of-scope step. Real
  delivery remains unverified in this phase (`DECISION-003:54-57`).

### 5. No leakage and no new package (confirmed)

- No GitHub concept is introduced into core registry: `packages/registry` has no GitHub dependency
  or import; `packages/github` → `@simplify-dev/schemas` only (`packages/github/package.json:23-28`);
  `apps/registry-api` → `@simplify-dev/github` only (`apps/registry-api/package.json:26-28`).
  Dependency direction from `AGENTS.md:113-176` and `:296-322` is preserved.
- **No new package is required or authorized.** Webhook-only config and claim port belong in
  `packages/github`; dispatch belongs in `packages/github/src/webhooks`; the tunnel belongs in
  root scripts. A `@simplify-dev/webhooks` or `@simplify-dev/tunnel` package would fragment one
  responsibility across boundaries and violate `AGENTS.md:180-181,352-383`.

## Alternatives considered

| Alternative                                                       | Decision / why                                                                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optional `mode` on `loadGitHubAppConfig`                          | Rejected: partial/union config weakens `auth.ts:40-49`, spreads narrowing, conflates two credential policies.                                                                 |
| Direct `process.env` read in `server.ts`                          | Rejected: duplicates validation, loses `GitHubIntegrationError` codes, puts config policy in transport.                                                                       |
| Keep `has()` + `record()` and add a lock in the handler           | Rejected: leaves claim policy in two places, remains non-atomic across adapters, duplicates authoritative logic.                                                              |
| Release claim on processing failure                               | Deferred: unsafe until downstream handlers are idempotent; requires a future ADR.                                                                                             |
| New webhook/tunnel package                                        | Rejected: no new boundary need; violates "package = responsibility/dependency boundary".                                                                                      |
| ngrok/localtunnel or downloading the tunnel during implementation | Rejected by `DECISION-003:46-52` (account requirement, network/data constraint).                                                                                              |
| Compose passing five **hardcoded/committed** GitHub values        | Rejected: fake configuration and secret leakage.                                                                                                                              |
| Compose passing five vars by **interpolation** from `.env.local`  | **Accepted by T-026b (Coordinator resolution 1):** equivalent to the documented `env_file` pattern; no secret value committed; webhook-only path still needs only the secret. |

## Consequences

Positive: credential-free local delivery becomes real rather than a 500; a single atomic claim
removes concurrent-duplicate processing; structured errors give deterministic HTTP mapping;
inert events become dispatchable; the tunnel stays a replaceable edge process.

Negative / new obligations: the `WebhookDeliveryStore` public port changes (workspace-internal,
no external consumers); in-memory claiming is process-local and must not be mistaken for a
distributed guarantee; one-shot claims mean a failed delivery is not reprocessed; the tunnel adds
a public unauthenticated ingress that must be documented as untrusted.

## Compatibility and security notes

- `loadGitHubAppConfig(env)` signature and five-variable contract are unchanged; the new factory is
  additive. Full App config remains required for authenticated actions (Phase 8, still blocked).
- Duplicate deliveries keep the existing 200 `status: 'duplicate'` wire contract
  (`handler.ts:43-48`, `server.ts:65-72`); changing it would cause GitHub retry storms.
- Error-code-based mapping (`errors.ts:1-13`) must not expose internal details to clients;
  `server.ts:89` remains the generic 500. Signatures are verified before any payload parsing or
  store write. Secrets stay in env only (`.env.example:1-2`, `.gitignore:27-29,47-50`).
- `docker-compose.yml:51-55` interpolates all five `GITHUB_APP_*` variables from the host
  environment / `.env.local`; no credential value is committed. Empty values for the four
  non-webhook variables do not affect webhook-only delivery (Coordinator resolution 1).
- The UI composition exception (Coordinator resolution 2) changes no registry/API contract:
  status views in `apps/web/components/**` consume existing `packages/ui` primitives and data
  obtained through the `registry-api` boundary, not GitHub internals or a new package.

## Boundary and dependency impact

- New edge: `apps/registry-api` → `loadWebhookReceiverConfig` (narrow config) in `@simplify-dev/github`.
- Changed edge: `webhooks/handler.ts` → `WebhookDeliveryStore.claim()`; `has()`/`get()` removed.
- New edge: `webhooks/handler.ts` → injected event handlers (policy in `packages/github`, effects
  remain owned by `RepositoryLinkStore` / connection service).
- New root-level dev edge: `scripts/**` + root scripts → local `registry-api` port; no package edge.
- Removed edge: `apps/registry-api` no longer depends on full GitHub App config for webhook startup.
- No edge to `packages/registry`, `apps/web`, Octokit internals, or any new package. The
  Coordinator resolution 2 UI exception uses the pre-existing `apps/web` → `packages/ui` edge only
  and adds no new edge from the webhook/GitHub/registry modules into `apps/web`.

## Migration plan (each step keeps the system working)

1. Add `webhooks/webhook-config.ts` + export; leave `config.ts` and `loadGitHubAppConfig` intact
   (T-030).
2. Change `WebhookDeliveryStore` to `claim()`/`record()`, update `InMemoryWebhookDeliveryStore`,
   update `handler.ts` to claim once and finalize; remove dead `get()` (T-030).
3. Replace handler-local parsing with `parseGitHubWebhookEvent`; convert magic strings to
   `GitHubIntegrationError` codes; add event-handler injection for repository/installation (T-030).
4. Switch `server.ts:18` to the narrow factory; map errors by code; send 400 before destroy at
   `server.ts:41` (T-030). Keep duplicate 200 behavior and health check unchanged.
5. Add HTTP-level tests (200/401/400/500, duplicate, dispatch, webhook-only config) and a reusable
   signed sender built on `computeWebhookSignature` (T-030).
6. Add root scripts + `.env.example` guidance + ignored-location tunnel harness (T-029); compose
   interpolates all five `GITHUB_APP_*` variables with no committed values and documents the
   `env_file` alternative for full-App flows (Coordinator resolution 1; implemented state).
7. Security sign-off (T-034) and documentation transcription (T-037). Rollback is per-step via
   reverting the owning commit; no global schema/data migration is involved.

## Architecture review (sign-off)

**status: approved** — the four proposed boundaries are coherent and preserve dependency
direction. Findings below are evidence-based; severity follows the review scale.

- [note] Confirmed: no GitHub concepts in `packages/registry` and no new package is introduced —
  see §5 and observed structure.
- [note] Confirmed: webhook-only config **must** be a separate factory (§1), not a mode on
  `loadGitHubAppConfig`; `auth.ts:40-49` depends on the complete config.
- [minor] `server.ts:16-17` documents an intent not implemented at `server.ts:18`; the narrow
  factory resolves it. Required change: T-030 must switch the call site, not merely add a new API.
- [major] TOCTOU at `handler.ts:42-49,93-98` with `ports.ts:78-82` / `memory.ts:35-41`; required
  change: single atomic `claim()` owned by the store (§2).
- [major] `handler.ts:83-91` records actions without dispatch; required change: injected declared
  handlers owned by the webhook handler boundary (§3).
- [minor] Duplicated parsing/magic strings at `handler.ts:28-40,51-56` vs `events.ts:10-38` and
  `errors.ts:1-13`; required change: reuse parser/error codes.
- [minor] `server.ts:41` destroys the socket before the 400 at `server.ts:80-82`; required change:
  respond first.
- [minor] No tunnel exists; boundary assigned to root scripts with untrusted-ingress semantics
  (§4). Required security condition: binary fetched only on demand into an ignored path.
- **[resolved by T-026b]** The earlier "required coordination action" asked to narrow
  `T-029` acceptance at `.agents/ledger.yaml:426` to a webhook-secret-only compose service.
  That request is withdrawn: interpolation of all five variables from host env / `.env.local`
  is the concrete equivalent of the documented `env_file` pattern and satisfies the ledger
  criterion literally with no committed secret. See Coordinator resolution 1.

## Risks

- Process-local in-memory claiming cannot coordinate multiple API instances — mitigation: document
  as dev/foundation-only; require a persistent unique-key adapter before horizontal scaling.
- One-shot claims hide downstream failures behind `duplicate` 200s — mitigation: record `'failed'`
  status for observability; revisit with an ADR once handlers are idempotent.
- Public tunnel exposes an unauthenticated endpoint — mitigation: verify-before-parse ordering,
  no binary committed, no secrets in args/logs, rate/size cap retained (`server.ts:9,33-48`).
- Ledger wording drift — **resolved** by DECISION-004 §1 and Coordinator resolution 1; no
  further ledger edit is required for the compose criterion.

## Verification

This was a read-only inspection; no builds/tests were run (not required by T-026). Compliance is
measured by: (a) `loadGitHubAppConfig` remaining five-variable and unchanged;
(b) `WebhookDeliveryStore` exposing one atomic `claim()` with a contract test for concurrent
duplicate delivery; (c) repository/installation dispatch tests at `packages/github/test/**` and
HTTP-level tests at `apps/registry-api/test/**`; (d) no tunnel/cloudflared reference in
`apps/registry-api/src/**` or `packages/github/src/**`; (e) no new workspace package and no
`@simplify-dev/github` import in `packages/registry`; (f) no committed secret or tunnel binary;
(g) compose uses `${...}` interpolation only (`docker-compose.yml:51-55`) with the `env_file`
alternative documented (`.env.example:95-99`); (h) status views live in `apps/web/components/**`,
compose existing `packages/ui` primitives, and no `modules/*` package exists (resolution 2).
Implementation verification gates are owned by T-029/T-030/T-032 and re-checked by
T-033/T-034/T-038.

## Open questions

- Should `WebhookDeliveryStore.get()` be retained for a future status UI? Recommendation: no —
  `apps/web` cannot import `packages/github` under `AGENTS.md:118-122`; any status surface must go
  through a `registry-api` endpoint, so `get()` is currently dead weight.
- Is one-shot claiming acceptable for repository-link sync retries? Recommendation: yes for this
  phase (no side effects are executed yet); revisit when dispatch handlers gain external effects.
