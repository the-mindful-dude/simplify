# Documentation — T-037

status: complete

Scope note: this task's lease was `packages/ui/README.md`, `docs/development/**`, and `README.md`.
All work below is inside that lease; architecture decisions, `AGENTS.md`, `TODO.md`, ledger, and
config were left untouched as instructed.

## Updated

- `packages/ui/README.md:11` — replaced the stale `styles/` + `styles.css` export claim with the
  exact T-032b replacement text describing `dist/` and "no separate `styles.css` package export".
  Required because `packages/ui/package.json` now ships only `dist`.
- `packages/ui/README.md:22-24` — replaced "Foundation scaffold … not implemented yet" with the
  exact T-032b replacement text (Status: implemented; exports listed in `src/index.ts`; public
  responsive types from `src/types.ts`; no `internal/` path exported).
- `docs/development/README.md:55-92` — added a "Local Webhook Delivery" section to the existing
  development setup doc (no new file created). It documents the required/optional env vars,
  secret-only local testing with no GitHub credentials, the three verified npm scripts, signed
  fixture sender behavior, safe tunnel usage with untrusted-ingress handling, and that this repo
  does not download/vendor/commit `cloudflared`.

## Verified against

- `.agents/reports/T-032b-design.md:76-83` — exact replacement text transcribed verbatim; `:11`
  and `:22-24` identified as the stale UI README lines.
- `packages/ui/package.json:7-15` — sole export is `.`; `files: ["dist"]` — no `styles/` export.
- `packages/ui/package.json:16-35` — build runs `copy-css.mjs`; Radix UI, tokens, React peer deps.
- `packages/ui/src/index.ts:1-118` — primitives/layouts/overlays/navigation exports; `:118`
  re-exports responsive types from `./types`; no `internal/` path exported.
- `packages/ui/src/types.ts` (present; T-032b report `:30-32`) — public responsive type source.
- `package.json:27-29` — `dev:webhooks`, `webhook:tunnel`, `webhook:send` scripts exist.
- `.env.example:15-23,43-58,60-99` — webhook-only path needs only `GITHUB_APP_WEBHOOK_SECRET`;
  full flows need five `GITHUB_APP_*` vars plus optional slug; `REGISTRY_API_PORT` default 3002;
  `WEBHOOK_PUBLIC_URL` is printed by the tunnel; `env_file` alternative; no committed values.
- `.gitignore:27-29,47-50` — `.env.local` ignored, `.env.example` committed.
- `apps/registry-api/package.json:22-23` — `dev`/`start` load `.env.local` via `--env-file` and
  `dev` builds before launch.
- `scripts/dev/start-registry-api.mjs:1-10` — aligns `PORT` to `REGISTRY_API_PORT` (default 3002).
- `scripts/dev/webhook-tunnel.mjs:3-16,19-23,34-45` — tunnel target `localhost:$REGISTRY_API_PORT`;
  probes `cloudflared --version` on `PATH`, prints Cloudflare download URL and exits when absent;
  no account required; repository does not vendor/download the binary; prints ephemeral
  `https://*.trycloudflare.com` URL and `/webhooks/github` path.
- `scripts/dev/send-webhook.mjs:5-30` — thin wrapper over `apps/registry-api/dist/dev/send-webhook.js`
  with `WEBHOOK_SENDER_MODULE` override.
- `apps/registry-api/src/dev/send-webhook.ts:11-18,27-74,76-86,93-142` — `--event`, `--url`,
  `--delivery`, `--help`; secret required; target defaults to local API or `WEBHOOK_PUBLIC_URL`;
  signs fixtures; no GitHub App credentials used.
- `apps/registry-api/src/app.ts:11,100-119,127-159` — 1 MB body cap; webhook-only config loader;
  `GET /healthz`; `POST /webhooks/github`; 200 response includes `status` (`processed`/`duplicate`).
- `packages/github/src/webhooks/handler.ts:52-74` — `x-hub-signature-256` verified before parse;
  duplicate delivery returns `status: 'duplicate'`.
- `packages/github/src/webhooks/signature.ts:3-23` — HMAC-SHA256 with timing-safe comparison.
- `apps/web/package.json:20-22` and `docs/architecture/ADR-001-next16-react19-upgrade.md:3,28-37`
  — Next 16.4.6 / React 19 accepted decision (basis for out-of-lease proposals below).

## Not updated

- `README.md` — in lease, but contains no React 18/Next 14 or implementation-status claim that is
  stale; its version-free "TypeScript, React, and Next.js" and future-tense "will be able to"
  wording remain accurate. No change made.
- `AGENTS.md:90` — out of lease (and coordinator-owned). Proposed exact replacement:
  `| React / Next.js       | React 19.x / Next.js 16.4.6                   |`
  (currently `React 18.x / Next.js 14.x`; verified stale against `apps/web/package.json:20-22`
  and ADR-001). Requires coordinator approval because a locked decision is involved.
- `docs/architecture/technical-standards.md:17-18` — out of lease (architecture doc). Proposed
  exact replacements: `| React                  | 19.x                                |` and
  `| Next.js                | 16.4.6                              |`. Same verified basis as above.
- `apps/web/README.md:15` — out of lease. Proposed replacement for the stale Status text:
  `Foundation implemented. The app renders local registry data through \`@simplify-dev/registry\`
  and composes status views from \`@simplify-dev/ui\` primitives, with route-level loading, error
  and not-found states.`
- `packages/github/README.md:21` — out of lease. Proposed replacement for the stale Status text:
  `Webhook foundation implemented: signature verification, atomic delivery claiming, structured
event parsing, injected lifecycle handlers, and a signed local-request helper. Full GitHub App
authentication and publishing are not implemented.`
- `TODO.md`, `.agents/ledger.yaml`, `docs/architecture/ADR-005-credential-free-webhook-boundaries.md`,
  `.env.example`, `package.json`, source and tests — explicitly out of scope for this task.
- `docs/development/**` — no pre-existing webhook-specific doc file existed, so the section was
  added to the existing `docs/development/README.md` rather than creating a new file.

## Unverified or ambiguous

- Real GitHub webhook delivery was not executed; the dev section explicitly says local fixture
  delivery does not verify real delivery. This matches `DECISION-003:54-57`.
- The three dev commands were not executed here (no `.env.local`, no running API, and the tunnel
  needs an externally installed `cloudflared`). Every command, flag, default, and path in the doc
  was verified by reading the scripts and configuration instead.
- `DECISION-003-webhook-foundation-phase.md:12-13` says the binary is "fetched only when the
  developer starts the local harness"; the implemented harness only probes `PATH` and asks the
  developer to install `cloudflared`. The doc records actual code behavior. Decision text was not
  edited (out of lease); coordinator may wish to reconcile the wording.
- No documentation build/lint beyond Prettier is declared by the project; no other doc gate run.

## Links and examples checked

- `packages/ui/README.md` references `src/index.ts`, `src/types.ts`, `scripts/copy-css.mjs`, and
  `dist/` — all confirmed to exist/ be produced by the documented build.
- `docs/development/README.md` shell examples cross-checked against `package.json:27-29` and
  `apps/registry-api/package.json:22-23`; flags against
  `apps/registry-api/src/dev/send-webhook.ts:11-18`; endpoint paths against `app.ts:127-132`.
- No Markdown links or anchors were added, so no link/anchor rewrites were required.
- `pnpm exec prettier --check packages/ui/README.md docs/development/README.md` → exit 0;
  "All matched files use Prettier code style!"
- `pnpm format:check` → exit 0; "All matched files use Prettier code style!"

## Next safe action

- Coordinator reviews and, if approved, applies the four out-of-lease proposed text changes above
  (`AGENTS.md:90`, `docs/architecture/technical-standards.md:17-18`, `apps/web/README.md:15`,
  `packages/github/README.md:21`), then runs the five repository gates and commits. No further
  in-lease documentation work remains for T-037.
