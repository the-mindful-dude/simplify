# ADR-004 — Phase 9 scope, environment/tooling baseline, Radix/DOM testing, and responsive API

- **Status:** Accepted — implemented (user-approved scope and tooling decision; commits 66afa11, 339086b)
- **Date:** 2026-11-19
- **Owners:** architect
- **Related tasks:** T-002, T-001, T-003, T-004, T-005, T-006, T-007

## Context

**Observed (repository/process evidence):**

- Branch/plan: `feat/phase-9-complete-premium-ui`, base `HEAD 558db78` (ledger). User direction is to **complete Phase 9** with branch continuity and **skip Phase 8** (no GitHub credentials available). GitHub integration remains bounded by `docs/architecture/github-workflow.md` and `AGENTS.md:296-322` but is out of scope for this phase's implementation work.
- Environment baseline issues (R-002): `npm run dev` fails with Turbo "Unable to find package manager binary: cannot find binary path"; pnpm absent; npm-only install created untracked `package-lock.json` lacking `@simplify-dev/*` workspace links; `pnpm-lock.yaml` tracked; Node `v22.22.3` observed vs `.nvmrc:1` pin `20`; all quality gates currently fail.
- Current tooling/contracts: `AGENTS.md:91-93,96-97` locks pnpm 9.x, Vitest, CSS custom properties + CSS Modules, Radix UI. `docs/architecture/technical-standards.md:118-130` defines mandatory quality gates. `packages/ui/src/index.ts:1`, `packages/tokens/src/index.ts:1`, and `packages/ui/styles/styles.css:1-13` are placeholders; no Radix or UI DOM test stack present (R-004).
- Framework upgrade context (R-003, ADR-001): Next.js 16.4.6 requires Node **>=20.9.0**; repo currently pins Node 20 in `.nvmrc:1` and `package.json:8` allows `>=20.0.0`.

**Authoritative user decisions:** complete Phase 9 (skip Phase 8); fix dev by provisioning pnpm@9.15.9 via Corepack + pnpm reinstall + Node >=20.9 while keeping pnpm primary; track both lockfiles (ADR-002); premium dark monochrome/silver registry browser using canonical token-driven `packages/ui`; add Radix and DOM testing deps; responsive API = simple flags + responsive value objects; 17-component set with per-component READMEs.

## Decision

### 1. Scope and sequencing

- Continue **Phase 9** on `feat/phase-9-complete-premium-ui`; do not start Phase 8 work requiring GitHub credentials.
- Prioritize restoring a working, verifiable development baseline (T-001, T-004) before/alongside UI and web delivery, while producing ADRs (T-002) to unblock contract-sensitive implementation.
- Deliver Phase 9 outcomes: audited/completed CLI safe operations as applicable (T-003), canonical tokens/UI library and docs (T-005/T-007), and upgraded premium registry browser in `apps/web` (T-006), all verified through repository gates.

### 2. Environment and package-manager baseline

- Provision **pnpm 9.15.9** via **Corepack** and perform a clean **pnpm reinstall** to restore workspace dependency links and Turbo/pnpm binary resolution.
- Raise Node baseline/floor to **>=20.9.0** (update `.nvmrc`, root `engines`, and related guidance/CI as needed) to satisfy Next 16 requirements and reduce environment drift; keep pnpm as the primary package manager (ADR-002).
- Keep dev/build orchestration compatible with existing scripts/Turborepo expectations; fix dev-task self-sufficiency only as needed for correct operation.

### 3. UI interaction and testing dependencies

- Add **Radix UI** dependencies required for accessible interactive components: `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-avatar` (scoped to appropriate packages, with deliberate exports and minimal surface).
- Add **DOM test tooling** for `packages/ui` (and other UI tests as needed): `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, integrated with **Vitest** per `AGENTS.md:93` and `docs/architecture/technical-standards.md:110,119-124`.
- Dependencies must be justified, version-compatible with the chosen React/Next baseline, and avoid unnecessary runtime cost (heavy/interactive code isolated where appropriate).

### 4. Responsive API contract (UI standard)

- Standardize responsive/visibility behavior in `packages/ui` on:
  - **Simple flags:** `hiddenBelow`, `hiddenAbove`, `collapsedBelow` (applied where semantically relevant to component/layout contracts).
  - **Responsive value objects:** `{ base, sm, md, lg, xl, 2xl }` for supported props/variants.
- Breakpoints and semantics must be token/system-consistent, typed, documented per component, and testable (see ADR-003 for canonical UI/token ownership).

## Alternatives considered

| Alternative                                                             | Why rejected                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start Phase 8 or block on GitHub credentials                            | Credentials unavailable; would stall progress contrary to user direction. Phase 8 remains future work per roadmap/`docs/architecture/github-workflow.md`.   |
| Continue using npm installs / ad-hoc node versions to "get dev running" | Fails workspace-link correctness and locked pnpm/tooling expectations; R-002 shows npm-only install breaks `@simplify-dev/*` resolution.                    |
| Remain on Node 20.0.x floor despite Next 16                             | Conflicts with Next 16 minimum Node >=20.9.0 (R-003) and invites runtime/tooling incompatibility.                                                           |
| Skip Radix/DOM testing deps and hand-roll interactive primitives/tests  | Higher risk of inaccessible dialogs/menus/tabs/tooltip behavior and weaker regression coverage; conflicts with locked Radix UI direction and quality goals. |
| Single responsive mechanism only (flags-only or object-only)            | Does not satisfy explicit user requirement for both simple flags and responsive value objects.                                                              |
| Create a new branch/rewrite history for Phase 9                         | Unnecessary; user requested branch continuity on current feature branch.                                                                                    |

## Consequences

**Positive**

- Restores a reproducible pnpm-based dev/test workflow aligned with Next 16/React 19 requirements.
- Enables accessible, testable interactive UI components needed for a premium registry browser.
- Provides a clear, consistent responsive contract across the 17-component library.
- Keeps Phase 9 delivery focused and credential-independent.

**Negative / risks**

- Environment and dependency changes may introduce temporary breakage until lockfiles, configs, and code are aligned (current baseline already failing per R-002).
- Additional dependencies increase install size and require maintenance/security review.
- Node floor bump may require contributor/CI image updates.

## Compatibility and migration

1. **Environment:** install/enable Corepack, provision pnpm@9.15.9, use Node >=20.9, run pnpm reinstall; verify `pnpm dev` and Turbo task resolution (T-001).
2. **Manifests/config:** update `.nvmrc`, root `package.json` engines/packageManager alignment as needed, and package-level devDependencies/peerDependencies for Radix and testing libs without violating boundaries (`AGENTS.md:169-176`).
3. **Lockfiles:** update `pnpm-lock.yaml` and tracked `package-lock.json` per ADR-002.
4. **Testing:** configure Vitest/jsdom and Testing Library setup for UI packages; add/maintain accessible DOM tests (`docs/architecture/technical-standards.md:110,144-153`).
5. **UI/web implementation:** implement responsive API and Radix-backed components in `packages/ui` (T-005) and consume them in `apps/web` (T-006); document per component (T-007).
6. **Verification:** run full applicable gates (`format:check`, `lint`, `typecheck`, `test`, `build`) and targeted package commands before completion claims.

## Rollback plan

- Revert environment/tooling commits (Corepack/pnpm scripts, Node floor changes, added deps, test config, lockfiles) to the last known-good state; reinstall and re-verify.
- If specific Radix or test packages are problematic, remove or replace them via a documented follow-up change while preserving accessibility and test coverage goals.
- Scope rollback does not authorize starting Phase 8 or altering unrelated roadmap decisions; supersede this ADR if direction changes.

## Security and performance notes

- **Security:** new UI/test dependencies expand supply-chain surface; select maintained packages, pin/lock via pnpm, and review advisories during updates. Test-only deps (jsdom/RTL/jest-dom) must remain dev-scoped. No GitHub credential handling is introduced in this phase.
- **Performance:** Radix primitives are used only where needed; keep components tree-shakeable and avoid blanket client rendering. Node/runtime upgrades and dependency changes should be validated against dev/build times and bundle impact (`docs/architecture/technical-standards.md:134-141`).
- **Reliability:** restoring deterministic pnpm workspace installs reduces "works on my machine" drift and supports consistent CI verification.

## Verification criteria

- [ ] `pnpm --version` reports **9.15.9** (Corepack) and workspace installs restore `@simplify-dev/*` links; `pnpm dev` no longer fails with Turbo binary-path error.
- [ ] Node baseline/floor is **>=20.9.0** in enforced config/docs as implemented, compatible with ADR-001.
- [ ] `pnpm-lock.yaml` and `package-lock.json` are both tracked and managed per ADR-002.
- [ ] Required Radix packages and `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` are added at correct scopes with Vitest-compatible configuration.
- [ ] `packages/ui` responsive API supports `hiddenBelow`/`hiddenAbove`/`collapsedBelow` flags and `{ base, sm, md, lg, xl, 2xl }` value objects, with tests/docs.
- [ ] Phase 8 remains unstarted/untouched due to credential constraint; Phase 9 deliverables meet acceptance when implemented and verified.
- [ ] Applicable quality gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (and targeted package checks).
- [ ] Transcribed ADR in `docs/architecture/` matches this decision.
