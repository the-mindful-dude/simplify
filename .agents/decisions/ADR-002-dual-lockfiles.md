# ADR-002 — Track both `pnpm-lock.yaml` and `package-lock.json` with pnpm as primary

- **Status:** Accepted (user-approved process/tooling decision; pending implementation and transcription to `docs/architecture/`)
- **Date:** 2026-11-19
- **Owners:** architect
- **Related tasks:** T-002, T-001, T-004, T-006

## Context

**Observed (repository/environment evidence):**

- `AGENTS.md:91,103` locks **pnpm 9.x workspaces** and forbids silently changing the package manager or introducing competing tools.
- Root `package.json:6` declares `"packageManager": "pnpm@9.15.9"`; `package.json:7-9` requires `pnpm >=9.0.0`.
- `.nvmrc:1` pins Node `20`; R-002 reports environment Node `v22.22.3` vs pin and current dev/tooling instability.
- `pnpm-lock.yaml` is tracked (present in repo). R-002 reports: `npm run dev` fails with Turbo "Unable to find package manager binary: cannot find binary path"; pnpm was absent; an npm-only install created an **untracked** `package-lock.json` with no `@simplify-dev/*` workspace links. At time of inspection, `package-lock.json` exists in the working tree and must not be deleted (ledger `preserve`).
- Baseline quality gates currently fail in this environment (R-002), consistent with missing workspace-linked installs.

**Authoritative user decisions:** fix dev via Corepack pnpm@9.15.9 + pnpm reinstall + Node >=20.9; keep pnpm primary; **track `package-lock.json` alongside `pnpm-lock.yaml`** and document with ADR.

## Decision

Adopt a **dual-lockfile, pnpm-primary** policy:

1. **Primary/canonical package manager:** **pnpm 9.15.9** (Corepack-provisioned) for workspace install, dependency resolution, CI, and release-oriented reproducibility. `pnpm-lock.yaml` is the **authoritative** lockfile for workspace graph and `workspace:*` linkage.
2. **Secondary tracked lockfile:** `package-lock.json` is **tracked in git** as an explicitly documented secondary artifact for npm compatibility/visibility (e.g., environments or tooling that inspect npm lockfiles). It is **not** the source of truth for workspace resolution.
3. **Precedence and hygiene:** when dependencies change, update `pnpm-lock.yaml` via pnpm first; regenerate/refresh `package-lock.json` only through an intentional, documented procedure consistent with the installed dependency set, and review diffs for drift. npm installs must not be used as the canonical path to "fix" workspace links.
4. **Dev environment repair (T-001):** provision pnpm via Corepack, align Node to >=20.9, perform clean pnpm reinstall to restore `node_modules/@simplify-dev/*` workspace symlinks, and ensure dev scripts run without Turbo binary-path failures.

This documents an approved workflow exception in how lock artifacts are tracked; it does **not** replace pnpm as the locked package manager (`AGENTS.md:91`).

## Alternatives considered

| Alternative                                     | Why rejected                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track only `pnpm-lock.yaml` (status quo intent) | Simplest single-source-of-truth, but conflicts with user decision to retain/track `package-lock.json` and leaves npm-generated artifacts ambiguous after accidental npm use. |
| Switch primary workflow to npm / npm lock only  | Violates locked pnpm workspace decision (`AGENTS.md:91`) and risks broken workspace protocol/link semantics; would require broad tooling migration not requested.            |
| Track neither or gitignore npm lockfile         | Would require deleting/ignoring an artifact the user explicitly wants preserved/tracked; increases confusion after npm operations.                                           |
| Use another manager (Yarn/Bun) alongside        | Adds competing tooling and cognitive overhead; explicitly out of scope and contrary to locked baseline.                                                                      |

## Consequences

**Positive**

- Preserves pnpm workspace correctness while honoring the explicit request to keep `package-lock.json` under version control.
- Makes lockfile intent auditable: contributors can see which file is authoritative and why both exist.
- Supports recovery from accidental npm installs by re-establishing pnpm as canonical.

**Negative / risks**

- **Lockfile drift:** the two files can diverge in metadata/resolution details, causing confusion or false confidence in `npm audit`/tooling that reads only npm lock data.
- Additional diff noise and maintenance burden on dependency updates.
- Potential CI/local inconsistency if someone runs `npm install` and commits unintended changes.

## Compatibility and migration

1. **Track artifact:** ensure `.gitignore` and repo hygiene permit committing `package-lock.json`; add it if untracked (preserve existing content per user instruction).
2. **Restore canonical state:** `corepack enable` / prepare `pnpm@9.15.9`, install Node >=20.9, run pnpm reinstall (frozen where appropriate once consistent) to regenerate correct workspace links and update `pnpm-lock.yaml` as needed.
3. **Document policy:** transcribe this ADR to `docs/architecture/` and reference in developer docs/CONTRIBUTING if applicable (T-008) so contributors know pnpm is primary and how to handle `package-lock.json`.
4. **Change management:** dependency bumps must be performed/validated via pnpm; any `package-lock.json` refresh should be intentional and reviewed alongside `pnpm-lock.yaml`.
5. **Scripts/CI:** keep `packageManager` and engines aligned (`package.json:6-9`), and avoid introducing npm-only workflows that bypass pnpm workspaces.

## Rollback plan

- If dual tracking proves harmful, stop tracking `package-lock.json` (remove from git/index and optionally gitignore) while retaining pnpm as primary, and record a superseding ADR.
- To revert environment repair only: restore prior `.nvmrc`/engine/script states and lockfile contents from git history, then reinstall with the then-canonical manager; note this may reintroduce R-002 dev failures.
- Never delete preserved user-requested artifacts without explicit instruction; prefer superseding documentation.

## Security and performance notes

- **Security:** lockfiles are supply-chain controls; drift between `pnpm-lock.yaml` and `package-lock.json` can obscure actual resolved versions. Security review and audits must treat **pnpm resolution/`pnpm-lock.yaml` as authoritative**, and any npm-lock-based report must be cross-checked.
- **Integrity:** avoid manual edits to lockfiles; regenerate via tooling. Do not commit secrets in environment-related changes.
- **Performance:** no runtime impact; minor developer/CI overhead from maintaining two lockfiles and potentially larger repo diffs.

## Verification criteria

- [ ] `pnpm --version` reports **9.15.9** when provisioned via Corepack (T-001).
- [ ] `pnpm install` restores `node_modules/@simplify-dev/*` workspace symlinks and dev commands no longer fail with Turbo "cannot find binary path".
- [ ] Both `pnpm-lock.yaml` and `package-lock.json` are tracked in git and preserved (no deletion).
- [ ] Documentation clearly states: pnpm primary, `pnpm-lock.yaml` authoritative, `package-lock.json` secondary/tracked, and drift-management expectations.
- [ ] Dependency/security checks reference the authoritative pnpm resolution; any npm-lock-derived findings reconciled.
- [ ] Transcribed ADR in `docs/architecture/` reflects the accepted policy.
