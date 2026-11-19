# ADR-001 — Upgrade `apps/web` to Next.js 16.4.6 and React 19

- **Status:** Accepted (user-approved locked-decision change; pending implementation and transcription to `docs/architecture/`)
- **Date:** 2026-11-19
- **Owners:** architect
- **Related tasks:** T-002, T-001, T-006

## Context

**Observed (repository evidence):**

- `AGENTS.md:88-90` locks `React 18.x / Next.js 14.x` and `Node.js 20 LTS`; `AGENTS.md:103,105` prohibits silently changing locked decisions and requires an explicit ADR in `docs/architecture/` documenting motivation, alternatives, consequences, compatibility, and migration.
- `docs/architecture/technical-standards.md:18-19,29` records `React 18.x`, `Next.js 14.x`, and pinned patch versions in root config/lockfiles.
- `apps/web/package.json:20-22` declares `next: ^14.2.21`, `react: ^18.3.1`, `react-dom: ^18.3.1`; `apps/web/package.json:10` already uses `eslint .` (not `next lint`).
- Root `package.json:7-9` sets `engines.node >=20.0.0`, `engines.pnpm >=9.0.0`; root devDependencies include `typescript: ^5.6.3` (`package.json:44`) and React 18 typings/runtime entries (`package.json:35-36,41-42`).
- `.nvmrc:1` pins Node `20`.
- `pnpm-lock.yaml` is tracked; research (R-002) reports it resolves Next `14.2.35` and current quality gates fail in the present environment.

**Verified research facts (R-003, provided):**

- Latest stable Next.js is **16.4.6** (released 2026-11-09, https://github.com/vercel/next.js/releases/tag/v16.4.6).
- Next.js 16 requires **Node >=20.9.0** (https://nextjs.org/docs/app/guides/upgrading/version-16).
- React **>=18.2** is supported by Next 16 but deprecated; **React 19 is recommended** and required in Next 17 (https://nextjs.org/docs/messages/react-version).
- Migration considerations: async request APIs, `middleware` → `proxy`, `next lint` removal, Turbopack default, review `next.config.mjs` `experimental.outputFileTracingRoot` (reported at lines 9-11 in research), TypeScript >=5.1 (repo 5.6.3 satisfies), image defaults changed. **Do not adopt Cache Components opportunistically.**

**Authoritative user decisions:** complete Phase 9 on current branch; upgrade to latest Next.js 16.4.6 + React 19; fix dev environment with pnpm/Node floor alignment.

## Decision

Upgrade `apps/web` from Next.js 14.x/React 18.x to **Next.js 16.4.6** and **React 19** (including `react-dom` and matching type packages) as an approved, documented exception to the locked baseline in `AGENTS.md:88-90` and `docs/architecture/technical-standards.md:18-19`.

Implementation shall:

- Bump `next`, `react`, `react-dom`, and `@types/react`/`@types/react-dom` to compatible React 19/Next 16 versions; update workspace lockfiles per ADR-002.
- Raise the Node floor to **>=20.9.0** in `.nvmrc`, root `package.json` engines, and CI/dev guidance as needed (coordinated with T-001/ADR-004).
- Apply required Next 16 migration changes only: async request APIs, `middleware` → `proxy` rename/contract only if present/required, keep linting via ESLint (`apps/web/package.json:10` already compliant), review `outputFileTracingRoot` and image config for breaking defaults, and avoid Cache Components or unrelated App Router redesign.
- Preserve `apps/web` dependency boundaries (`AGENTS.md:118-120,160-162`) and consume registry/UI/token packages through public entry points.

## Alternatives considered

| Alternative                                      | Why rejected                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stay on Next 14.x / React 18.x                   | Preserves current lock but conflicts with explicit user direction to adopt latest stable Next/React for Phase 9; delays required migration and misses fixes/features available in 16.4.6.                                            |
| Incremental upgrade (14 → 15 → 16)               | Lower per-step risk in general, but increases churn and duplicate verification passes for this scoped Phase 9 effort; direct upgrade to verified latest stable is feasible given small app surface and explicit migration checklist. |
| Upgrade Next but keep React 18                   | Technically possible short-term per Next 16 support, but deprecated and creates near-term rework before Next 17; user explicitly approved React 19.                                                                                  |
| Adopt Next canary or enable Cache Components now | Unnecessary instability/speculative behavior change; violates "no opportunistic Cache Components" constraint.                                                                                                                        |

## Consequences

**Positive**

- Aligns framework baseline with current stable Next.js (16.4.6) and React 19, enabling ongoing maintenance and Phase 9 UI work on supported APIs.
- Clarifies Node/tooling floor and removes ambiguity around deprecated React 18 usage.
- Encourages deliberate migration review (async APIs, config defaults) improving correctness.

**Negative / risks**

- Breaking changes may affect routing, request APIs, config, image behavior, or third-party compatibility; requires careful verification.
- React 19 type/behavior changes can surface latent issues in web/package code and dependencies.
- Temporary instability during coordinated dependency, lockfile, and environment updates (R-002 baseline currently broken).

## Compatibility and migration

1. **Preconditions:** provision pnpm 9.15.9 and restore workspace installs (T-001); ensure Node >=20.9.0 runtime available.
2. **Dependencies:** update `apps/web/package.json` and any root/shared React/Next/type dependencies to Next 16.4.6 / React 19 compatible ranges; run pnpm install and update tracked lockfiles per ADR-002.
3. **Config/scripts:** confirm no `next lint` usage (already `eslint .`), review `next.config.*` for `experimental.outputFileTracingRoot`, image defaults, and Turbopack implications; keep ESM/TS strict conventions (`AGENTS.md:95`, `docs/architecture/technical-standards.md:20,26,75`).
4. **Code migration:** apply codemods/manual fixes for async request APIs and `middleware` → `proxy` only where applicable; do not introduce Cache Components.
5. **Validation:** run repository quality gates and smoke-test `pnpm dev`/`pnpm --filter @simplify-dev/web build`.

**Compatibility notes:** This is a breaking toolchain/framework baseline change for `apps/web` contributors and CI images; downstream packages remain framework-agnostic where required (`AGENTS.md:139-141,164-166`).

## Rollback plan

- Revert the implementation commit(s) touching framework deps, config, migrated code, and lockfiles.
- Restore `apps/web/package.json:20-22` (Next 14 / React 18), root React/type deps, `.nvmrc`/engines if changed solely for this upgrade, and prior `pnpm-lock.yaml`/`package-lock.json` states.
- Re-run `pnpm install`, `pnpm build`, and `pnpm dev` to confirm return to prior baseline; keep this ADR marked Superseded/Reverted in transcription if rollback occurs.

## Security and performance notes

- **Security:** upgrading to a current stable framework reduces exposure to known issues fixed after 14.x; dependency updates must be reviewed for supply-chain and advisory impact. No secrets/config exposure changes are intended.
- **Performance:** Turbopack-by-default and newer Next/React runtimes may improve dev/build performance, but image/default behavior changes require verification to avoid regressions. Do not enable speculative caching features.
- **Risk control:** migrate only required surfaces; preserve boundary rules and avoid expanding client-only scope (`docs/architecture/technical-standards.md:137-138`).

## Verification criteria

- [ ] `apps/web` declares and resolves Next **16.4.6** and React 19 / React DOM 19 compatible packages; lockfiles updated consistently per ADR-002.
- [ ] Node floor documented/enforced as **>=20.9.0** where required.
- [ ] No `next lint` usage; lint passes via configured ESLint.
- [ ] Required Next 16 migrations applied (async request APIs, proxy/config/image adjustments as applicable) with no Cache Components adoption.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm dev` (smoke) succeed for affected scope per repo gates.
- [ ] `apps/web` renders real local registry data without placeholder behavior (T-006 acceptance, when implemented).
- [ ] Transcribed ADR in `docs/architecture/` matches this decision and records the approved locked-decision change (`AGENTS.md:105`).
