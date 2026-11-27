# I-F1.R7 — Review of I-F1.13-F stale hash repair

- Task: I-F1.13-F
- Reviewer: reviewer
- Status: APPROVE
- Scope: one-line expected integrity hash correction in `packages/registry/test/index.test.ts:34`.

## Evidence

- New expected value equals two independent SHA-256 computations of `registry/ui/button/@1.0.0/asset.json`.
- Working-tree and HEAD asset bytes are unchanged (`sha256sum 7dd21b35...872a78a99`).
- Strict assertion at `test/index.test.ts:155-159` is byte-identical to HEAD and unchanged.
- Only the one fixture line changed; no asset, schema, lockfile, or I-F1.9-leased file was modified by this task.

## Checks

- Bugfixer: focused test 30/30; registry package 7 files/112 tests; typecheck and lint exit 0.
- Coordinator final `pnpm test` — all workspace tests passed, including registry 112/112.

## Outcome

APPROVE. The repair is included in `d25dcb8`.
