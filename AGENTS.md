# AGENTS.md

Guidance for AI agents and contributors working in the simplify.dev repository.

## 1. Sources of Truth

Read these before making changes, in priority order:

1. `docs/MODEL.md` — product model, architecture, boundaries, and non-negotiable rules.
2. `TODO.md` — implementation roadmap and phase ordering.
3. `docs/architecture/` — resolved architectural decisions for the current implementation.
4. `README.md` — product summary and public positioning.
5. Existing code and tests — local conventions win for style, never for architecture.

If a request conflicts with `docs/MODEL.md`, stop and raise the conflict instead of
silently violating the model. Update `docs/architecture/` in the same change that alters a
documented contract.

## 2. What simplify.dev Is

simplify.dev is a registry-driven platform for discovering, installing, customizing, and
connecting reusable software building blocks. It is not just a component library. It
distributes:

- UI Components
- Blocks (functional interface compositions)
- Logic (framework-independent behavior)
- Integrations (adapters to external services)
- Recipes (pre-integrated combinations)
- Templates (application starting points)
- Libraries (distributable collections of assets)

Three product principles govern every decision:

- **Reusability** — build useful capability once.
- **Customizability** — expose implementation details without losing managed-package
  convenience.
- **Composability** — independent assets connect through clearly defined interfaces.

Primary targets: TypeScript, React, Next.js. The registry, manifests, and installer must
remain extensible to other languages and frameworks.

## 3. Locked Technical Decisions

| Area | Decision |
| --- | --- |
| Package scope | `@simplify-dev/*` |
| CLI executable | `simplify`, provided by `@simplify-dev/cli` |
| Runtime | Node.js 20 LTS |
| TypeScript | 5.x, strict |
| React / Next.js | React 18.x / Next.js 14.x |
| Package manager | pnpm 9.x workspaces |
| Build orchestration | Turborepo |
| Test runner | Vitest |
| Lint / format | ESLint + Prettier |
| Module format | ESM only |
| Styling | CSS custom properties + CSS Modules |
| Headless UI | Radix UI |
| Registry distribution | Static versioned metadata/artifacts first |
| GitHub authorization | GitHub App |

Exact versions are pinned in the repository configuration. Do not silently upgrade or
downgrade the baseline; treat it as an architectural change.

## 4. Non-Negotiable Architecture Rules

### 4.1 Dependency Direction

Dependencies flow inward toward stable contracts. Never create cycles.

```
apps/web ───────────────► registry client, ui, tokens, preview runtime
apps/registry-api ──────► registry, github
cli ────────────────────► registry client/resolver, tooling
github ─────────────────► registry contracts only
tooling ────────────────► schemas, registry contracts
blocks ─────────────────► ui, interaction, integration contracts
ui ─────────────────────► tokens
interaction ────────────► framework-independent code only
tokens ─────────────────► framework-independent code only
registry ───────────────► schemas only
schemas ────────────────► no runtime dependencies
```

Hard rules:

- The registry and asset model must not depend on GitHub-specific concepts.
- The GitHub integration must not own or redefine the registry asset model.
- The CLI must not import the web application's internals.
- The web application must consume registry data; it must not maintain a separate catalogue.
- Framework-independent logic must not import React or UI components.
- Core logic must not import provider SDKs or database clients directly.
- Integrations implement declared interfaces/adapters; they are optional dependencies.
- No package may import another package's `internal/` path or deep file path. Use public
  entry points only.
- Do not create a new package until it represents a real reusable boundary.

### 4.2 Asset and Library Model

- An **asset** is an independently installable implementation.
- A **library** is a distributable collection of related assets.
- One logical asset may have multiple implementations for different languages/frameworks.
- Recipes compose assets; they must not duplicate asset implementations.
- Templates compose existing assets whenever possible.
- Application-owned concerns stay outside assets: authentication, authorization,
  permissions, credentials/secrets, business rules, database ownership, deployment,
  persistence policy, and data protection.

### 4.3 Manifests and Versioning

- Libraries use `simplify/library.json`; assets use category-specific manifests.
- Manifests describe identity, targets, dependencies, installation, files, docs, preview,
  license, and attribution.
- The registry must understand a library independently of repository directory layout.
- Published versions are immutable and reproducible. Never silently replace a release.
- Record repository identity, commit SHA, tag/release, version, timestamp,
  artifact/snapshot, and validation results.
- Development snapshots must be distinguishable from stable releases.
- Use Semantic Versioning for stable releases.

### 4.4 Installation Safety

Supported modes: package, source, hybrid.

- Never overwrite user-modified files without an explicit decision.
- Never replace secrets or environment values.
- Never execute arbitrary registry-provided scripts.
- Restrict target paths to approved project directories; prevent path traversal.
- Prefer safe writes, backups, and rollback for multi-file operations.
- Apply only declarative, supported configuration changes.
- Show a plan/summary before destructive operations.
- Track installed assets in `.simplify/` with versions, files, hashes, and dependencies.

### 4.5 GitHub-First Workflow

- GitHub is the canonical source for library source code and history.
- simplify.dev owns registry metadata, validation, distribution, and installation.
- Support connecting existing repositories and creating new repositories.
- Use a GitHub App with least-privilege, explicitly requested permissions.
- GitHub Actions is the primary validation/publishing environment.
- Ordinary pushes must never become unintended stable releases.
- Webhooks must be authenticated, idempotent, and resilient to retries and out-of-order
  delivery.
- Preserve published versions when repositories are renamed, deleted, or made inaccessible.
- The core registry must remain usable without GitHub.

### 4.6 UI and Logic Isolation

- Components consume semantic design tokens; no hardcoded brand values.
- Support controlled and uncontrolled state where meaningful.
- Customization surface: `className`, slot styling, `slotProps`, `slots`, variants,
  sizes, tokens, controlled state, and callbacks.
- Accessibility is functionality: semantics, names, keyboard, focus, announcements,
  reduced motion, labels, and validation.
- Keep presentation separate from behavior. UI consumes stable controller/state interfaces.
- Define transport/storage contracts; provider and database adapters implement them.
- Avoid mandatory global providers. Use CSS custom properties and theme attributes.
- Preserve React server/client boundaries deliberately; do not mark everything client-only.
- Keep imports tree-shakeable; heavy dependencies stay optional or isolated.

## 5. Repository Layout

The workspace uses the full `docs/MODEL.md` layout:

```
apps/web/                 registry browser, docs, Theme Studio
apps/registry-api/        hosted registry service, only when needed

packages/registry/        schema, resolver, client
packages/github/          authorization, repositories, webhooks, publishing
packages/cli/             commands, detection, installation, dependency-resolution, updates
packages/tokens/          source, generators, outputs
packages/ui/              primitives, components, hooks, internal, styles
packages/interaction/     framework-independent feature logic
packages/blocks/          functional React compositions
packages/tooling/         asset-validator, library-builder, preview-runtime

registry/                 official asset source layout
schemas/                  registry, configuration, asset, library schemas
docs/architecture/        architecture decisions and contracts
docs/development/         local development and contribution setup
```

Create packages only when they represent a meaningful boundary. Placeholder packages must
be valid, buildable, and contain no fake implementations.

## 6. Coding Conventions

- TypeScript-first; strict type checking.
- pnpm workspaces; do not introduce a second package manager.
- ESM-only imports and exports.
- Follow existing naming, export, and file conventions before inventing new ones.
- Public exports must be deliberate. Do not export internal utilities by accident.
- Prefer small, focused modules with explicit interfaces over broad utility grab-bags.
- Use structured error types and actionable messages. Never leak secrets or credentials.
- Do not add comments unless they clarify non-obvious decisions; match local style.
- Validate external input at boundaries (registry responses, manifests, config, webhooks).
- Avoid `any`; if unavoidable, isolate and justify it.
- Keep framework-independent logic free of React and vendor SDK imports.
- Update documentation and manifests when behavior or contracts change.

Naming summary:

| Kind | Convention |
| --- | --- |
| Workspace package | `@simplify-dev/<name>` |
| Directory / file | kebab-case |
| React component export | PascalCase |
| Function / variable | camelCase |
| Type / interface | PascalCase |
| CSS module | `<component>.module.css` |
| Design token | `--sd-<role>` |
| Asset ID | `<category>/<name>` |

## 7. Testing and Quality Gates

Every change must pass the repository's format, lint, type-check, test, and build gates.
Do not claim completion without running them.

Expected coverage by area:

- Registry/tooling: schema tests with valid and invalid fixtures; resolver tests.
- CLI: command tests without a real terminal; dry-run, conflict, rollback, path-safety tests.
- GitHub integration: webhook signature/idempotency/retry tests; permission and lifecycle
  tests.
- UI: accessibility, keyboard, focus, reduced motion, light/dark/custom theme, responsive.
- Blocks: loading, empty, error, pending, success, disabled, streaming/cancellation.
- Logic: unit tests without a React runtime.
- Integrations: contract tests with controlled services.
- Installation: package, source, hybrid, updates, removal, fresh and existing projects.

Visual regression coverage is required for important UI components and blocks. Tests must
not depend on real credentials or private services.

## 8. Security and Trust

- Validate all manifests, paths, dependencies, and artifacts before publishing or
  installing.
- Verify webhook signatures; reject unauthenticated events.
- Use least-privilege GitHub App permissions and scoped publishing tokens.
- Never expose tokens, credentials, or secrets to browser clients or logs.
- Never commit secrets or environment values.
- Treat repository contents and workflows as untrusted input.
- Do not execute arbitrary repository code during registry ingestion.
- Forked pull request workflows must not access publishing credentials.
- Distinguish official, community, verified, deprecated, and compromised assets.
- Record publisher identity and publication provenance.

## 9. Git Workflow: Commit and Push Frequently

This repository requires incremental, reviewable history.

- Create a new branch for each task or phase; do not work directly on `main`.
- Commit after every coherent, working change. Do not wait for a large batch of work.
- Push after every commit, as soon as the commit is created.
- Prefer small commits with a clear scope over large mixed commits.
- Each commit should leave the repository in a valid, buildable state where practical.
- Use concise, imperative commit messages that match the repository style.
- Never commit secrets, credentials, generated local data, or environment files.
- If a push fails because of missing permissions, report the exact error, keep committing
  locally, and retry the push after each subsequent commit.
- Do not force-push, amend published commits, or rewrite shared history unless explicitly
  asked.
- Do not open pull requests unless explicitly asked.

Suggested commit sequence for a phase:

1. Architecture documents and agent guidance.
2. Root workspace configuration.
3. Package layout and boundaries.
4. CI, contribution docs, and release configuration.
5. Verification fixes.

## 10. Change Management

Before starting:

1. Identify the relevant `TODO.md` phase and task.
2. Check `docs/MODEL.md` and `docs/architecture/` for applicable boundaries.
3. Inspect neighboring code and tests for conventions.

Definition of done:

- All relevant TODO bullets are satisfied.
- Tests are added or updated and pass.
- Format, lint, type-check, and build pass.
- Documentation and manifests are updated.
- No architecture boundary, security rule, or immutability rule is violated.
- No unrelated refactors are included unless explicitly requested.
- The change is committed and pushed.

## 11. Current Status

- Phase 1 architecture decisions are documented in `docs/architecture/`.
- Phase 2 establishes the monorepo, tooling, and workspace boundaries.
- Do not build runtime features before their phase in `TODO.md`.
- Placeholder packages must be valid and buildable, not mock implementations.
- Update this file when a locked decision or workflow rule changes.
