# simplify.dev Architecture

This directory records the architecture decisions and implementation contracts for
simplify.dev. It complements, but does not replace, [`../MODEL.md`](../MODEL.md), which
defines the product model and non-negotiable boundaries.

## Reading Order

1. [`../../README.md`](../../README.md) — product summary.
2. [`../MODEL.md`](../MODEL.md) — authoritative product and architecture model.
3. [`product-scope.md`](./product-scope.md) — categories, asset model, installation modes,
   initial ecosystem, and ownership boundaries.
4. [`github-workflow.md`](./github-workflow.md) — GitHub-first library lifecycle and
   publishing model.
5. [`naming-and-identifiers.md`](./naming-and-identifiers.md) — package, CLI, asset,
   registry, and repository identifiers.
6. [`technical-standards.md`](./technical-standards.md) — languages, tooling, module
   boundaries, quality gates, and versioning.
7. [`../specifications/`](../specifications/) — public manifest, installation, versioning,
   configuration, and registry index contracts.
8. [`github-integration.md`](./github-integration.md) — GitHub App, repository
   connections, webhooks, and publishing pipeline responsibilities.
9. [`ADR-001-next16-react19-upgrade.md`](./ADR-001-next16-react19-upgrade.md) — approved Next.js 16.4.6 / React 19 upgrade and Node floor change.
10. [`ADR-002-dual-lockfiles.md`](./ADR-002-dual-lockfiles.md) — pnpm-primary with both lockfiles tracked.
11. [`ADR-003-canonical-tokens-and-ui-contracts.md`](./ADR-003-canonical-tokens-and-ui-contracts.md) — canonical tokens and `packages/ui` component contracts.
12. [`ADR-004-phase9-scope-and-tooling.md`](./ADR-004-phase9-scope-and-tooling.md) — Phase 9 scope, tooling baseline, Radix/DOM testing, and responsive API.
13. [Architecture Decision Records](#architecture-decision-records-adr) below — complete ADR-001…015 index with status and intent.

## Architecture Decision Records (ADR)

Intents are derived from each ADR's title and Decision section. ADR-001…004 have transcribed
records in this directory; the canonical records for ADR-005…015 remain in `.agents/decisions/`.

| ADR                                                                                     | Intent                                                                                                                                         | Status                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [ADR-001](./ADR-001-next16-react19-upgrade.md)                                          | Upgrade `apps/web` to Next.js 16.4.6 and React 19, raise the Node floor, and record the toolchain migration.                                   | Accepted — implemented |
| [ADR-002](./ADR-002-dual-lockfiles.md)                                                  | Track both lockfiles with pnpm as the primary, canonical workspace manager.                                                                    | Accepted — implemented |
| [ADR-003](./ADR-003-canonical-tokens-and-ui-contracts.md)                               | Make canonical tokens the design source and `packages/ui` the single home for reusable components.                                             | Accepted — implemented |
| [ADR-004](./ADR-004-phase9-scope-and-tooling.md)                                        | Fix Phase 9 scope, the Node/pnpm environment baseline, Radix/DOM test tooling, and responsive API conventions.                                 | Accepted — implemented |
| [ADR-005](../../.agents/decisions/ADR-005-credential-free-webhook-boundaries.md)        | Keep webhook-only configuration credential-free via a separate factory, with atomic claiming, dispatch, and tunnel boundaries.                 | Accepted               |
| [ADR-006](../../.agents/decisions/ADR-006-publication-provenance-boundary.md)           | Treat local builds as a provenance candidate; only the registry may record verified, immutable publications.                                   | Accepted               |
| [ADR-007](../../.agents/decisions/ADR-007-frontend-module-topology.md)                  | Define private frontend `modules/*` packages and the `core <- domains <- app <- apps/web` dependency direction.                                | Accepted (ratified)    |
| [ADR-008](../../.agents/decisions/ADR-008-tanstack-query.md)                            | Adopt TanStack Query as the single web data/cache layer with per-request clients and domain-owned query keys.                                  | Accepted (ratified)    |
| [ADR-009](../../.agents/decisions/ADR-009-motion-for-react.md)                          | Allow Motion for React only for orchestrated motion; CSS motion tokens drive sidebar hover/collapse.                                           | Accepted (ratified)    |
| [ADR-010](../../.agents/decisions/ADR-010-radix-context-menu.md)                        | Add one Radix-backed `ContextMenu` in `packages/ui` for keyboard-accessible item actions.                                                      | Accepted (ratified)    |
| [ADR-011](../../.agents/decisions/ADR-011-cmdk-command-palette.md)                      | Put cmdk behind a single design-system `CommandPalette` backed by one registry-data command registry.                                          | Accepted (ratified)    |
| [ADR-012](../../.agents/decisions/ADR-012-registry-repository-and-artifact-layout.md)   | Establish one canonical registry artifact layout/resolver and a `RegistryRepository` port with a server-only disk adapter.                     | Accepted (ratified)    |
| [ADR-013](../../.agents/decisions/ADR-013-app-shell-and-navigation-ownership.md)        | Put shell/nav policy in `modules/app` and generic primitives in `packages/ui`; one collapsible sidebar with groups, context menus, workspaces. | Accepted (ratified)    |
| [ADR-014](../../.agents/decisions/ADR-014-design-system-only-controls.md)               | Require every interactive control to come from `@simplify-dev/ui`; no bare native controls in pages or modules.                                | Accepted (ratified)    |
| [ADR-015](../../.agents/decisions/ADR-015-framework-baseline-and-doc-reconciliation.md) | Reconcile docs to the Next 16/React 19 baseline and transcribe ratified ADRs into `docs/architecture/`.                                        | Accepted (ratified)    |

ADR-007…015 were ratified as Accepted by
[`DECISION-FE-FOUNDATION-002.md`](../../.agents/decisions/DECISION-FE-FOUNDATION-002.md) on 2026-11-24
(user: "proceed"). Their binding rules are summarized in
[`technical-standards.md`](./technical-standards.md) §§4.1–4.3. These records describe ratified
contracts for the redesign, not shipped UI; phasing is recorded in
`.agents/reports/FE-FOUNDATION-IMPLEMENTATION-PLAN.md`.

## Documentation Rules

- Architecture documents describe decisions that affect more than one package or contract
  area.
- Documents must not contradict `docs/MODEL.md`. If they do, `docs/MODEL.md` wins and the
  conflict must be resolved explicitly.
- Implementation details that are local to a single package belong in that package's
  `README.md`, not here.
- Architecture documents are living documents. Update them in the same change that alters
  the contract they describe.
- Use clear normative language: **must**, **should**, and **may** have their usual meaning.

## Status

| Document                                       | Status   |
| ---------------------------------------------- | -------- |
| `product-scope.md`                             | Initial  |
| `github-workflow.md`                           | Initial  |
| `naming-and-identifiers.md`                    | Initial  |
| `technical-standards.md`                       | Initial  |
| `ADR-001-next16-react19-upgrade.md`            | Accepted |
| `ADR-002-dual-lockfiles.md`                    | Accepted |
| `ADR-003-canonical-tokens-and-ui-contracts.md` | Accepted |
| `ADR-004-phase9-scope-and-tooling.md`          | Accepted |

ADR-005…015 are indexed with intent summaries in [Architecture Decision Records](#architecture-decision-records-adr) above; their canonical records are in `.agents/decisions/`.

The documents are considered stable once workspace tooling enforces their rules in CI.
