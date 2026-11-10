# Technical Standards

Status: Approved. Source of truth: `docs/MODEL.md`.

## 1. Purpose

This document defines the language, tooling, module boundaries, quality gates, and
versioning standards for the simplify.dev monorepo.

## 2. Language and Runtime Baseline

| Area                   | Standard                            |
| ---------------------- | ----------------------------------- |
| Primary language       | TypeScript                          |
| Runtime                | Node.js 20 LTS                      |
| TypeScript             | 5.x, strict mode                    |
| React                  | 18.x                                |
| Next.js                | 14.x                                |
| Package manager        | pnpm 9.x workspaces                 |
| Module format          | ESM only                            |
| Build orchestration    | Turborepo                           |
| Test runner            | Vitest                              |
| Linting                | ESLint                              |
| Formatting             | Prettier                            |
| Headless UI foundation | Radix UI                            |
| Styling                | CSS custom properties + CSS Modules |

Exact patch versions are pinned in the root `package.json`, `pnpm-lock.yaml`, and
`.nvmrc`. Upgrades are deliberate changes that update this document when they alter
support guarantees.

## 3. Repository and Workspace Rules

- The repository is a pnpm workspace orchestrated by Turborepo.
- Every workspace package has its own `package.json`, `tsconfig.json`, `src/index.ts`,
  and `README.md`.
- TypeScript uses a shared base configuration and project references where appropriate.
- Packages are ESM-only and expose explicit `exports`.
- `internal/` directories and non-entry files are not exported.
- Shared tooling configuration lives at the repository root.
- Generated output, coverage, local registry data, `.simplify/`, and environment files are
  ignored.

## 4. Module Boundaries

Dependencies must flow toward stable contracts. Cycles are forbidden.

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
- The CLI must not import web application internals.
- The web application must consume registry data, not maintain a separate catalogue.
- Framework-independent logic must not import React or UI components.
- Core logic must not import provider SDKs or database clients directly.
- Integrations implement contracts and remain optional dependencies.
- Packages must import only public entry points of other packages.
- A new package requires a genuine reusable boundary, not merely a folder.

## 5. TypeScript and API Conventions

- `strict` is enabled. Avoid `any`; isolate and justify it when unavoidable.
- Public APIs use explicit types and deliberate exports.
- No wildcard re-exports of internal modules.
- Prefer named exports for utilities and logic. Default exports are limited to framework
  entry points that require them.
- Use discriminated unions for state machines and result types.
- Use `readonly` for immutable inputs where practical.
- Avoid non-null assertions in public code; validate at boundaries.
- Public contracts must be documented with TSDoc when the name and types are not
  self-explanatory.

## 6. Error Handling

- Use structured error types with stable codes for CLI, registry, GitHub, and installer
  failures.
- Error messages must be actionable and must identify the file, field, or operation.
- Never include secrets, tokens, environment values, or private paths in errors or logs.
- Distinguish expected validation failures from unexpected internal errors.
- Network, webhook, and installation operations must be retryable and idempotent where
  the contract allows it.
- Partial failures must leave the project or registry in a consistent state or report the
  exact recovery step.

## 7. Testing Strategy

| Area         | Required coverage                                                               |
| ------------ | ------------------------------------------------------------------------------- |
| Schemas      | Valid and invalid fixtures; compatibility tests.                                |
| Registry     | Lookup, indexing, immutability, artifact integrity.                             |
| Resolver     | Nested, missing, conflicting, circular, and optional dependencies.              |
| CLI          | Commands without a real TTY; dry-run, conflicts, rollback, path safety.         |
| GitHub       | Signature verification, idempotency, retries, lifecycle events.                 |
| Tooling      | Validation, build determinism, include/exclude rules.                           |
| Logic        | Unit tests without a React runtime.                                             |
| UI           | Accessibility, keyboard, focus, themes, responsive behavior, visual regression. |
| Blocks       | Loading, empty, error, pending, success, disabled, streaming, cancellation.     |
| Integrations | Contract tests with controlled services.                                        |
| Installation | Package, source, hybrid, updates, removal, fresh and existing projects.         |

Tests must not depend on real credentials or private services. Use controlled fakes and
fixtures.

## 8. Quality Gates

The repository CI and local development must run the same gates:

1. Format check.
2. Lint.
3. Type-check.
4. Unit and integration tests.
5. Build.
6. Boundary and export checks.

A change is not complete until all gates pass. Visual regression and accessibility checks
apply to UI and blocks as they are introduced.

## 9. Performance Requirements

- Packages must be tree-shakeable with deliberate public exports.
- Importing one component must not pull in unrelated components or heavy dependencies.
- Heavy dependencies remain optional or isolated behind integration packages.
- Preserve React server/client boundaries deliberately; do not mark whole libraries as
  client-only.
- Avoid unnecessary rerenders, state duplication, context updates, and render-time work.
- Use dynamic imports for large or optional features where appropriate.
- Measure package size and verify tree-shaking before publishing.

## 10. Accessibility Requirements

Accessibility is functionality, not an optional style.

- Use semantic HTML and accessible names and descriptions.
- Support keyboard navigation, focus management, and focus restoration.
- Provide screen-reader announcements for dynamic state.
- Implement correct dialog, menu, and overlay behavior.
- Respect reduced-motion preferences.
- Provide accessible form labels and validation messages.
- Test light, dark, and custom themes and responsive viewports.

## 11. Security Requirements

- Validate all external input at boundaries: registry responses, manifests, configuration,
  webhook payloads, and CLI arguments.
- Verify file integrity using stored hashes.
- Prevent path traversal and writes outside approved project directories.
- Never execute arbitrary registry-provided or repository-provided scripts.
- Never overwrite user-modified files or environment secrets without explicit consent.
- Use least-privilege GitHub App permissions and scoped publishing credentials.
- Never expose credentials to browser clients or logs.
- Treat external libraries as third-party code.
- Support deprecation and removal of unsafe versions.

## 12. Styling and Design Tokens

- Components consume semantic tokens via CSS custom properties.
- CSS Modules provide scoped component styles.
- Components must not hardcode brand values.
- Semantic roles remain distinct; changing a primary brand color must not alter
  destructive or error colors.
- Token generation is framework-independent and must not depend on React.
- Theme selection uses root attributes or classes; a global React provider is not required
  for basic components.
- Generated token outputs must be reproducible from the canonical token source.

## 13. Registry Distribution

- Start with static, versioned registry metadata and immutable artifacts.
- Separate discovery indexes, manifests, and file artifacts so they can be cached
  independently.
- Pinned versions must not depend on the latest index remaining available.
- Published artifacts remain available even if the source repository changes or becomes
  inaccessible.
- Add hosted registry services only when publishing, discovery, or access-control
  requirements justify them.
- Registry storage details remain separate from the client and resolver interfaces.

## 14. GitHub Integration Standards

- Use a GitHub App with explicitly requested, least-privilege repository permissions.
- Store App credentials and private keys securely outside the repository.
- Generate short-lived installation tokens and handle expiration.
- Verify webhook signatures and validate payloads.
- Make webhook handlers idempotent and resilient to retries and out-of-order delivery.
- Never expose installation tokens or credentials to the browser.
- Treat forked pull request workflows as untrusted and credential-free.
- Record publication provenance and publisher identity.

## 15. Versioning

- Internal simplify.dev packages and external library releases are versioned
  independently.
- Published library versions follow Semantic Versioning.
- Published versions are immutable; corrections require a new version.
- Git tags and GitHub releases are the preferred stable release markers.
- Development snapshots use branch and commit identifiers and are distinguishable from
  stable releases.
- Breaking changes to manifests, configuration, or public APIs require explicit schema or
  major-version changes and compatibility notes.

## 16. Acceptance Criteria

- Language, runtime, framework, and tooling versions are fixed.
- Module boundaries and dependency direction are explicit.
- TypeScript, error handling, testing, and quality gates are defined.
- Performance, accessibility, and security minimums are defined.
- Styling, token, registry, and GitHub standards are defined.
- Internal and external versioning are explicitly independent.
