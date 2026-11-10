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

| Path                   | Responsibility                                       |
| ---------------------- | ---------------------------------------------------- |
| `apps/web`             | Registry browser, documentation, Theme Studio.       |
| `packages/registry`    | Registry contracts, resolver, and client.            |
| `packages/github`      | GitHub App, repositories, webhooks, publishing.      |
| `packages/cli`         | `simplify` command-line application.                 |
| `packages/tokens`      | Design tokens and generated outputs.                 |
| `packages/ui`          | React components and styles.                         |
| `packages/interaction` | Framework-independent feature logic.                 |
| `packages/blocks`      | Functional React compositions.                       |
| `packages/tooling`     | Asset validation, library building, preview runtime. |
| `registry/`            | Official asset source layout.                        |
| `schemas/`             | Shared JSON schemas and generated types.             |
| `docs/architecture/`   | Architecture decisions and contracts.                |

## Environment Variables

Do not commit environment files. Local environment values belong in `.env.local` or your
shell environment. Commit only declarative examples such as `.env.example`.

Next.js loads `.env.local` automatically. Container runs use the values supplied by
`docker-compose.yml` or a local `.env` file. Shell variables take precedence over file
values. Never place credentials in `.env.example`, source code, or container images.

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
