# I-F1.13-R — Integrity hash baseline research

- Task: I-F1.13-R
- Owner: explore (READ-ONLY)
- Status: COMPLETE
- Scope: `packages/registry/test/index.test.ts` and `registry/ui/button/@1.0.0/asset.json`.

## Findings

- Correct reproduction command is `pnpm --filter @simplify-dev/registry test`; root-level Vitest invocation is config-incompatible.
- Failure was isolated to `index.test.ts:158`: expected stale `sha256-lfy0SVjc...` versus actual `sha256-fdIbNW9T...`.
- HEAD and working blobs for the test and asset were byte-identical; `git hash-object` and `sha256sum` matched HEAD.
- Commit-level evidence showed `b8312e8` (I-F1.8) changed the asset bytes and left the hardcoded expectation stale.

## Outcome

The failure predated I-F1.9 and was repaired by I-F1.13-F. No files were changed by the research owner.
