# Development Setup

## Requirements

- Node.js 20 LTS (see `.nvmrc`)
- pnpm 9.x
- Git

## Install

```bash
pnpm install
```

## Common Commands

```bash
pnpm dev            # run development tasks
pnpm build          # build all packages and applications
pnpm lint           # lint workspace packages
pnpm typecheck      # type-check workspace packages
pnpm test           # run unit and integration tests
pnpm format         # format the repository
pnpm format:check   # verify formatting
pnpm clean          # remove build output and dependencies
```

## Workspace Map

| Path                   | Responsibility                                          |
| ---------------------- | ------------------------------------------------------- |
| `apps/web`             | Registry browser, documentation, Theme Studio.          |
| `apps/registry-api`    | Hosted registry API service, including GitHub webhooks. |
| `packages/registry`    | Registry contracts, resolver, and client.               |
| `packages/github`      | GitHub App, repositories, webhooks, publishing.         |
| `packages/cli`         | `simplify` command-line application.                    |
| `packages/tokens`      | Design tokens and generated outputs.                    |
| `packages/ui`          | React components and styles.                            |
| `packages/interaction` | Framework-independent feature logic.                    |
| `packages/blocks`      | Functional React compositions.                          |
| `packages/tooling`     | Asset validation, library building, preview runtime.    |
| `registry/`            | Official asset source layout.                           |
| `schemas/`             | Shared JSON schemas and generated types.                |
| `docs/architecture/`   | Architecture decisions and contracts.                   |

## Environment Variables

Do not commit environment files. Local environment values belong in `.env.local` or your
shell environment. Commit only declarative examples such as `.env.example`.

Next.js loads `.env.local` automatically. Container runs use the values supplied by
`docker-compose.yml` or a local `.env` file. Shell variables take precedence over file
values. Never place credentials in `.env.example`, source code, or container images.

## Local Webhook Delivery

The registry API exposes `POST /webhooks/github` (and `GET /healthz`) for local development. You
can exercise it with signed fixtures and, optionally, a public Cloudflare quick tunnel. Signed
fixture testing needs no GitHub account, GitHub App, or credentials.

Copy `.env.example` to `.env.local` at the repository root and set `GITHUB_APP_WEBHOOK_SECRET` to
a throwaway value. The receiver verifies the `X-Hub-Signature-256` header with this value, so the
local sender must use the exact same value. Leave the other `GITHUB_APP_*` variables empty: they
are required only for full App flows (authentication, repository APIs, publishing), not for
webhook-only testing. `.env.local` is ignored by Git and loaded with Node's `--env-file`; no
dotenv dependency is needed.

```bash
pnpm dev:webhooks                  # build and start the API on REGISTRY_API_PORT (default 3002)
pnpm webhook:send -- --help        # list sender options
pnpm webhook:send -- --event push  # sign a fixture and POST it to the local endpoint
pnpm webhook:tunnel                # optional: open a public quick tunnel
```

`pnpm webhook:send` signs a fixture with `GITHUB_APP_WEBHOOK_SECRET` and POSTs it to
`http://localhost:<REGISTRY_API_PORT>/webhooks/github` by default. Use `--url <url>` to target a
different endpoint, `--event <name>` to choose the fixture, or `--delivery <id>` to control the
delivery id; a repeated id is answered as a duplicate. The sender needs the API built first —
`pnpm dev:webhooks` builds it, or run `pnpm --filter @simplify-dev/registry-api build` manually.

`pnpm webhook:tunnel` opens a Cloudflare quick tunnel to the local API and prints an ephemeral
`https://*.trycloudflare.com` base URL together with the full webhook URL
(`<base>/webhooks/github`). Quick tunnels require no Cloudflare account. Copy the URL into a
GitHub App's webhook settings manually and use the same secret. This repository does not download,
vendor, or commit `cloudflared`: the harness only checks whether `cloudflared` is on `PATH`, and
if it is missing it prints Cloudflare's download instructions and exits. Install it yourself if
you want a public tunnel.

Treat all tunnel-originated requests as untrusted until signature verification succeeds. Keep the
API bound locally and do not expose its raw port publicly. Local fixture delivery does not verify
real GitHub delivery; that requires a GitHub App configured with the matching secret and a current
tunnel URL. Keep real credentials out of fixtures and logs, and never commit `.env.local`.

## Monorepo Rules

- Packages are ESM-only and expose deliberate `exports`.
- Internal package paths are not public entry points.
- Turborepo runs tasks in dependency order; a package must build before its dependents.
- Generated output (`dist`, `.next`, `coverage`, `.turbo`) is not committed.

## CI

GitHub Actions runs formatting, linting, type-checking, tests, builds, and a container
build. The same commands must pass locally before committing.

## Containers

The production image builds `apps/web` from the repository root with a multi-stage
Dockerfile and Next.js standalone output.

```bash
pnpm docker:build        # build the production web image
pnpm docker:up           # run the production web service on PORT (default 3000)
pnpm docker:down         # stop the services
pnpm docker:dev          # run the web development server on DEV_PORT (default 3001)
```

The development profile mounts the repository and keeps container-owned dependencies in
anonymous volumes. Rebuild the profile after changing workspace manifests.
