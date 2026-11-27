# ADR-007 — Frontend module topology and dependency direction

- Status: Accepted
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; supersedes `.agents/decisions/DECISION-004-boundary-conflicts.md:17-27` for the new redesign scope only

## Context

Observed facts:

- `pnpm-workspace.yaml:1-4` contains only `apps/*`, `packages/*`, `schemas`; no `modules/*` pattern and no tracked `modules/` path (`git ls-files modules` returned empty, exit 0).
- No repository document defined a `modules/*` layout before this redesign (T-P002A:31). Prior architect co-sign in `.agents/decisions/DECISION-004-boundary-conflicts.md:17-27` and `ADR-005...:3-12` decided **no** new `modules/*` package for the phase-8-scoped status-view work, on the grounds that the views had no independent reuse boundary and `AGENTS.md:379-383` forbids packages created merely to organize files.
- `.agents/decisions/DECISION-FE-FOUNDATION-001.md:11` is a later, explicit user decision: `modules/core`, `modules/app`, and domain modules are **real `@simplify-dev/*` workspace packages** with explicit exports, project boundaries and ESLint rules.
- `docs/MODEL.md:285-303,1043-1049` and `AGENTS.md:118-120` make `apps/web` the browser/composition surface; `apps/registry-api/src/app.ts:3-9,97-160` and `apps/registry-api/package.json:26-28` confirm it is a Node webhook receiver depending only on `@simplify-dev/github`. `modules/registry/` (frontend) is NOT `apps/registry-api/`.

Forces: the user's later decision is authoritative for the new scope, but the earlier "no empty packages" rule remains binding. Both are satisfied only by creating a small number of modules with real responsibilities and deferring the rest until their code exists.

## Decision

1. Add `modules/*` to `pnpm-workspace.yaml` and create **private** (`"private": true`) packages named `@simplify-dev/module-<name>`. They are application-internal workspace packages, never published contracts.
2. Create now, with real code in the first implementation increment:
   - `modules/core` — cross-domain contracts and pure infrastructure (query-client factory, structured `AsyncState`/`RepositoryError`, `APP_ROUTES`, navigation/workspace _types_, minimal fixture repository helper). No I/O, no React components, no domain entity types, no `next/*`.
   - `modules/app` — application shell, nav config, sidebar composition, providers, command/mobile hosts. Depends on `core` + `@simplify-dev/ui` + `@tanstack/react-query`. Only `modules/app` and `apps/web` may import `next/*`; domain modules must not.
   - `modules/registry` (frontend feature module) — registry repository port, query keys, hooks and view mappers; real on-disk adapter behind a deliberate `./server` subpath. Depends on `core` + `@simplify-dev/registry` (canonical types/client) + `@tanstack/react-query`.
3. Create later, only when their own queries/components/fixtures exist: `modules/dashboard`, `modules/assets`, `modules/collections`, `modules/compositions`, `modules/publishers`, `modules/settings`. Do not create placeholder packages or `modules/auth` (visual-only auth pages belong to `apps/web` route files).
4. Dependency direction is strictly `core <- domains <- app <- apps/web`. `app` does **not** depend on domain modules; it receives nav contributions as data assembled by `apps/web` (the composition root). Domain-to-domain edges are allowed only for read-only registry view primitives (`assets`/`collections`/`compositions` -> `modules/registry`) and must be recorded in the boundary check.
5. No existing published package (`registry`, `github`, `cli`, `tooling`, `ui`, `tokens`, `blocks`, `interaction`, `schemas`) and **not** `apps/registry-api` may depend on any `modules/*` package. Existing published APIs stay additive-only.

## Alternatives considered

| Alternative                                                          | Why rejected                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One `modules/web` god package containing shell, data and all domains | Violates `AGENTS.md:196` (god modules), `AGENTS.md:180-181` (one responsibility) and the user's no-duplication rule; makes single-ownership unenforceable.                     |
| Create all nine modules immediately with placeholder exports         | Violates `AGENTS.md:379-383` ("no fake implementations", "do not create packages merely to organize files"); DECISION-004's original rationale remains valid for empty shells. |
| Keep everything app-local in `apps/web` (status-quo precedent)       | Contradicts the later explicit user decision (DECISION-FE-FOUNDATION-001:11) and concentrates filter/sort/detail state in `registry-browser.tsx:90-108,235-307`.               |
| Put shell/nav in `packages/ui` because it is visual                  | `packages/ui` owns reusable primitives, not route/workspace policy (ADR-003:33-45); would leak app concerns into a published package.                                          |
| Let domains depend on `modules/app` for shell types                  | Creates a cycle (`app` composes domains at the route level) and inverts the agreed direction.                                                                                  |

## Consequences

Positive: one authoritative home per responsibility; private packages cannot become accidental public contracts; existing packages and `apps/registry-api` are untouched; modules can be added as real code lands.

Negative: three new manifests/tsconfigs/build entries and a boundary checker; `apps/web` must wire contributions explicitly (slightly more composition code); the earlier DECISION-004 §2 must be explicitly limited to its prior phase scope.

Neutral: file/folder layout of existing packages does not change in this ADR.

## Boundary and dependency impact

New edges: `apps/web -> modules/app`, `apps/web -> modules/* (domains)`, `modules/app -> modules/core`, `modules/app -> @simplify-dev/ui`, `modules/registry -> modules/core`, `modules/registry -> @simplify-dev/registry`, `(assets|collections|compositions) -> modules/registry` (conditional, read-only).

Removed edges: none. Changed edge: none. Published package graph unchanged. `apps/registry-api -> @simplify-dev/github` unchanged; no `modules/registry`/`apps/registry-api` coupling of any kind.

## Migration plan

1. Add `modules/*` pattern and boundary rules; no modules exist yet — system unchanged.
2. Add `modules/core` (pure contracts); no consumer yet — system unchanged.
3. Add `modules/app` and consume it from one new route shell while the existing page remains routed — both work in parallel.
4. Add `modules/registry`, migrate `apps/web/lib/registry-data.ts:190-273` behind the port (thin re-export first, delete later).
5. Add domain modules one at a time as their routes are built.
6. Revert any single step independently; private modules and additive exports keep prior steps buildable.

## Risks

| Risk                                                   | Likelihood | Impact | Mitigation                                                                                                                                     | Owner                   |
| ------------------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `core` becomes a dumping ground                        | medium     | high   | Explicit export allowlist in its `package.json`; reject imports of domain entity types; boundary check asserts no `node:fs`/`next/*` in `core` | architect + implementer |
| Modules accidentally published                         | low        | high   | `"private": true` on every module manifest; CI assertion                                                                                       | foundation              |
| Prior DECISION-004 §2 read as still forbidding modules | medium     | medium | This ADR records the supersession and rationale; coordinator briefs all agents                                                                 | coordinator             |

## Verification

- `pnpm-workspace.yaml` contains `modules/*`; each module has `private: true`, a single deliberate `.` export (and `./server` for registry), lint/typecheck/test scripts.
- Boundary checker output shows no cycle and no forbidden edge (especially no `packages/*` or `apps/registry-api` -> `modules/*`).
- `git ls-files` confirms no empty module (`src/index.ts` plus at least one real implementation/test per created module).
