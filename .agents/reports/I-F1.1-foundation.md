# Foundation — I-F1.1

status: needs_review
lease: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.github/workflows/ci.yml`, `scripts/**`

## Proposal and approval

- proposal: Wire the future `modules/*` packages into the pnpm workspace and establish report-only architecture/quality gates so F1.2 can add module directories without changing repository validation semantics. Recommended: (1) add `modules/*` to the workspace; (2) add a dependency-free deterministic boundary checker under `scripts/checks/`; (3) add report-only ESLint gates for ADR-014 native controls and ADR-003 raw hex colours; (4) make gate files Turbo global cache inputs; (5) run the boundary checker as a non-failing CI step. Recommended against: creating empty module directories (F1.2 scope), adding a tunnel tool, adding a database/CI provider/registry, adding dependencies, adding a `check:boundaries` Turbo task (root `package.json` is outside the lease and a task without a package script is a missing-task error), and adding `paths` to `tsconfig.base.json` (no modules exist yet and `apps/web` already overrides `paths`; adding dead aliases would be speculative).
- trade-offs: One Node script is the single authoritative source for ADR-007 edges (no ESLint duplication); it uses only `node:fs`, `node:path` and `node:url`, strips comments while preserving offsets, and always exits 0. ESLint gates are `warn` severity so `pnpm lint` still exits 0. Turbo `globalDependencies` invalidates task caches on gate changes instead of introducing an inert task. CI calls the checker directly because root scripts cannot be edited in this lease. Official docs consulted: Turborepo configuration (`https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx`), ESLint custom rules, selectors and `no-restricted-syntax` (`https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rules.md`, `.../selectors.md`, `.../no-restricted-syntax.md`), GitHub Actions workflow syntax (`https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax`).
- approval: I-F1.1 task brief with explicit foundation lease; implemented 2026-11-24. Infrastructure/CI changes still require `security` and `reviewer` sign-off via the coordinator.

## Changed

- `pnpm-workspace.yaml:4` — added `modules/*` so future module packages are workspace members; no directories created.
- `turbo.json:3` — added `globalDependencies` for `eslint.config.mjs`, `scripts/checks/**`, `tsconfig.base.json` so gate changes invalidate all task hashes.
- `eslint.config.mjs:5-22` — imported the local hex rule and defined ADR-014 restricted JSX intrinsic selectors.
- `eslint.config.mjs:66-72` — report-only ADR-014 gate for `apps/web/**` and `modules/**`; `packages/ui/src` intentionally excluded.
- `eslint.config.mjs:73-84` — report-only ADR-003 hex-colour gate for component source; generated token outputs are not matched.
- `.github/workflows/ci.yml:46-48` — added non-failing "Architecture boundaries (report-only)" step running `node scripts/checks/boundaries.mjs`.
- `scripts/checks/boundaries.mjs:1` — new no-dependency report-only checker: deterministic file walk, comment stripping, import extraction, six rule IDs (`web-module-internal`, `core-forbidden-import`, `core-jsx-source`, `module-cross-internal`, `domain-next-import`, `packages-to-modules`), sorted WARN output, exit 0, plus `--self-test` with 12 in-memory cases.
- `scripts/checks/eslint/no-hex-literals.mjs:1` — new local ESLint rule reporting 3/4/6/8-digit hex literals in literals and template quasis at warn severity.

## Behavior

- `node scripts/checks/boundaries.mjs` scans 166 source files across `apps`, `packages`, `modules`, `schemas`, `test` and reports `0 forbidden edge warning(s)` with `result: PASS (report-only; exit 0)`.
- `--self-test` proves the checker detects all six forbidden edge classes and ignores benign imports: `self-test: 12 cases, 0 failure(s)`.
- `pnpm --filter @simplify-dev/web lint` emits exactly 9 ADR-014 warnings (0 errors) and exits 0.
- ESLint probe confirms `simplify-gates/no-hex-literals` fires at severity 1 in `apps/web`, `modules` and `packages/ui/src`, and does not apply to `packages/tokens/src/outputs`.
- No toolchain, lint, validation, build or public contract semantics were changed by the new gates.

## Verification

- `node scripts/checks/boundaries.mjs --self-test` — 12 cases, 0 failures, exit 0 (after fixing a relative-path/prefix bug found by this check).
- `node scripts/checks/boundaries.mjs` — 166 files scanned, 0 warnings, `result: PASS (report-only; exit 0)`.
- `pnpm exec prettier --write pnpm-workspace.yaml turbo.json eslint.config.mjs .github/workflows/ci.yml scripts/checks/boundaries.mjs scripts/checks/eslint/no-hex-literals.mjs && pnpm exec prettier --check <same files>` — "All matched files use Prettier code style!".
- `pnpm --filter @simplify-dev/web lint` — 9 warnings, 0 errors, exit 0; warnings at `app/not-found.tsx:22`, `app/page.tsx:9`, `components/hero.tsx:69,72`, `components/site-header.tsx:16,25,28,31,34`.
- ESLint API probe with in-memory `hex-probe.tsx` — `simplify-gates/no-hex-literals` severity 1 in app/module/UI paths; no such warning in token outputs.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — 19/19 lint tasks, 19/19 typecheck tasks, root 9/9 tests plus all package tests, 11/11 build tasks; all exit 0.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` — fails at `pnpm format:check` with exit 2 on out-of-lease coordinator files (see Checks that could not run).
- `git status --short` / `git diff --stat` — only four leased config files modified plus untracked `scripts/checks/`; no out-of-lease implementation files changed.
- No Docker or `gh` CLI was used.

## Checks that could not run

- `pnpm format:check` (and therefore the full declared validation chain) — pre-existing parse error at `.agents/ledger.yaml:931:98` (`SyntaxError: Missing , or : between flow sequence items`) plus formatting warning for `.agents/reports/I-F1.0-artifact-verification.md`; both are tracked but outside this lease. All leased files pass scoped Prettier checks.
- `docker` / `gh` checks — not applicable to this change and both CLIs are denied.

## Risks and limitations

- The checker is deliberately conservative: it inspects import specifiers and file extensions, not TypeScript type resolution; unusual dynamic imports may be missed until F2.4 hardens it.
- Report-only gates do not fix the 9 existing native `<a>` usages; they only surface them. Converting them requires `apps/**` ownership in a later task.
- `modules/` is intentionally absent; pnpm now accepts it as a workspace glob, but no module package or tsconfig alias exists yet.
- CI and ESLint configuration changes require `security` and `reviewer` sign-off before acceptance.

## Discovered but not fixed

- `.agents/ledger.yaml:931` invalid flow-sequence mapping and `.agents/reports/I-F1.0-artifact-verification.md` formatting — evidence: `pnpm format:check` output above; out of lease and owned by coordinator/documenter.
- 9 native `<a>` elements in `apps/web` — evidence: `pnpm --filter @simplify-dev/web lint` output; report-only by design, app source is out of lease.
- Next.js build warnings for dynamic filesystem access in `apps/web/lib/registry-data.ts:146,160` — evidence: `pnpm build` output; pre-existing and unrelated to this lease.
- Root `package.json` has no `check:boundaries` script — evidence: lease and ownership map; could not add one without coordinator approval, so CI calls `node` directly and no Turbo task was added.

## Next safe action

- Coordinator obtains `security` and `reviewer` sign-off and asks the documenter to repair the two out-of-lease `.agents/**` formatting defects so `pnpm format:check` and the full validation chain can pass.
