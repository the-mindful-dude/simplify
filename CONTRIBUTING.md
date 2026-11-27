# Contributing to simplify.dev

Read [`docs/MODEL.md`](./docs/MODEL.md) and [`docs/architecture/`](./docs/architecture/)
before making changes.

## Development Setup

Requirements:

- Node.js 20 LTS
- pnpm 9.x
- Git

```bash
pnpm install
pnpm build
pnpm test
```

## Workspace Commands

| Command             | Purpose                               |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run workspace development tasks.      |
| `pnpm build`        | Build all packages and applications.  |
| `pnpm lint`         | Run ESLint across workspace packages. |
| `pnpm typecheck`    | Type-check all workspace packages.    |
| `pnpm test`         | Run Vitest across workspace packages. |
| `pnpm format`       | Format the repository with Prettier.  |
| `pnpm format:check` | Verify formatting without writing.    |
| `pnpm clean`        | Remove build output and dependencies. |

## Workflow

1. Create a branch from `main`; do not work directly on `main`.
2. Make a small, coherent change.
3. Run the full quality gates.
4. Commit with a concise, imperative message.
5. Push immediately after each commit.
6. Do not open pull requests unless asked.

## Quality Gates

Every change must pass:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Pull requests must pass the same checks in CI.

## Architecture Rules

- Dependencies flow inward toward stable contracts; never create cycles.
- The registry and asset model must not depend on GitHub-specific concepts.
- The CLI must not import web application internals.
- Framework-independent logic must not import React or UI components.
- Integrations implement declared contracts and remain optional.
- Never import another package's `internal/` path.
- Published versions are immutable.
- Never commit secrets, credentials, environment values, or generated local data.

See [`docs/MODEL.md`](./docs/MODEL.md) and [`docs/architecture/`](./docs/architecture/)
for the complete rule set.

## Commit Style

Use concise imperative messages, for example:

```
docs: define product scope
chore: initialize monorepo tooling
feat: add workspace package layout
fix: reject path traversal in source installer
```

Keep commits focused. Do not mix documentation, tooling, and unrelated refactors in one
commit.

## Repository Settings

The `main` branch must be protected with required status checks from the CI workflow.
Direct pushes to `main` are not permitted.

## Release Process

simplify.dev uses Changesets for internal package versioning.

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

Internal package releases are versioned independently from published library releases.
Published libraries follow Semantic Versioning and immutable release rules.
