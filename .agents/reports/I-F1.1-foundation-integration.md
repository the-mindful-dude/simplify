# I-F1.1 / I-F1.1b — Workspace wiring and report-only gates

Owner: foundation | Review: reviewer APPROVE | Security: APPROVE
Files: `pnpm-workspace.yaml`, `turbo.json`, `eslint.config.mjs`, `.github/workflows/ci.yml`, `scripts/checks/boundaries.mjs`, `scripts/checks/eslint/no-hex-literals.mjs`

## Work

- Added `modules/*` to the pnpm workspace; no placeholder module directories created.
- Added deterministic report-only boundary checker with rules: web-module-internal, core-forbidden-import, core-jsx-source, module-cross-internal, domain-next-import, packages-to-modules, and (remediation) app-to-domain-module + deep-package-import.
- Added report-only ESLint gates for ADR-014 native controls and ADR-003 raw hex literals; wired checker into CI and Turbo cache inputs.

## Review remediation

- Initial REQUEST_CHANGES: missing app-to-domain and deep-import rules. Fixed in I-F1.1b; self-test expanded 12 -> 27 cases with positive/negative coverage.

## Verification

- `node scripts/checks/boundaries.mjs --self-test` => 27 cases, 0 failures.
- `node scripts/checks/boundaries.mjs` => 170 files scanned, 0 warnings, exit 0.
- Full chain `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` => exit 0; lint has 9 expected report-only ADR-014 native-`<a>` warnings in `apps/web` (0 errors).
- CI remains `pull_request`, `permissions: contents: read`, no secrets added (security APPROVE).

## Risks

- New `deep-package-import` overlaps older specialized rules; one edge may produce two warnings (deterministic, report-only).
- Gates remain advisory until F2.4.
