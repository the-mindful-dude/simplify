# I-F1.2 / I-F1.7 — `modules/core` and Node 20 install repair

Owners: coder (I-F1.2), bugfixer (I-F1.7) | Review: reviewer APPROVE (I-F1.R2, I-F1.R3) | Security: APPROVE (I-F1.S3, resolving I-F1.S2)

## Work

- `modules/core/**`: real private `@simplify-dev/module-core` with a single `.` export; `AsyncState<T>`, `RepositoryError`, frozen `APP_ROUTES`, nav/workspace types, and `createAppQueryClient()` (`staleTime: 30_000`, `gcTime: 300_000`, fresh instance per call).
- Added `@tanstack/react-query@5.108.4` as the only new dependency, per ADR-008.
- `package.json`: added pnpm-recognised parent-scoped override `pnpm.overrides["@octokit/request>content-type"] = "2.1.0"`.
- `pnpm-lock.yaml`: regenerated; TanStack entries preserved; `content-type@3.1.1` (Node >=22) replaced with integrity-pinned `content-type@2.1.0` (Node >=18).

## Root cause and fix

- pnpm 9.15.9 ignores npm-only top-level `overrides`; `@octokit/request@10.0.16` therefore resolved `content-type@3.1.1`, and `engine-strict=true` rejected Node 20.
- Fixed at the dependency boundary without touching `.npmrc`, Dockerfile, CI, Node baseline, or disabling gates.

## Verification

- Delegate checks: module tests 2 files / 8 tests; module typecheck/lint; full repo gates all green.
- Coordinator gate chain: `pnpm install --lockfile-only && pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && node scripts/checks/boundaries.mjs --self-test && node scripts/checks/boundaries.mjs` => `COORDINATOR_GATES_EXIT:0`.
- Lint 20/20 tasks with 9 expected report-only ADR-014 warnings; typecheck 20/20; tests 20/20 plus 9 root tests; build 12/12 with 2 known Turbopack warnings at `apps/web/lib/registry-data.ts:146,160`; boundary self-test 27/27; scan 177 files / 0 findings.

## Residual risks

- Scoped override is outside upstream `content-type@^3.0.0` range; API compatibility verified, but revalidate on Octokit upgrades.
- Exact pin may miss future 2.x security patches; review advisories deliberately.
- `package-lock.json` drift remains assigned to I-F1.6 per ADR-002.
