# Documentation — T-015

status: complete

## Updated

- docs/architecture/ADR-001-next16-react19-upgrade.md:3 — status line changed from `Accepted (user-approved locked-decision change; pending implementation and transcription to \`docs/architecture/\`)`to`Accepted — implemented (user-approved locked-decision change; commit 66afa11)`. Stale "pending" text removed; rest of ADR unchanged.
- docs/architecture/ADR-002-dual-lockfiles.md:3 — status line changed to `Accepted — implemented (user-approved process/tooling decision; commit cd9c235, lockfile refreshed in T-014)`. Stale "pending" text removed.
- docs/architecture/ADR-002-dual-lockfiles.md:54-56 — added `### Known limitation` under Consequences: `package-lock.json` covers root dependencies only, npm cannot resolve pnpm's `workspace:` protocol (so `next@16.4.6` and `@simplify-dev/*` links are absent), and `pnpm-lock.yaml` remains authoritative. Rest of ADR unchanged.
- docs/architecture/ADR-003-canonical-tokens-and-ui-contracts.md:3 — status line changed to `Accepted — implemented (user-approved architecture/product contract; commit 4271bad)`. Stale "pending" text removed; rest of ADR unchanged.
- docs/architecture/ADR-004-phase9-scope-and-tooling.md:3 — status line changed to `Accepted — implemented (user-approved scope and tooling decision; commits 66afa11, 339086b)`. Stale "pending" text removed; rest of ADR unchanged.

## Verified against

- `git show -s --format='%h %s'` on 66afa11, cd9c235, 4271bad, 339086b — all four commits exist on the branch and their subjects match the cited work (toolchain/Next16 upgrade, ADR sync + track package-lock, canonical tokens/UI, CLI safe operations).
- `.agents/reports/T-014.md:22,55,61,68` — npm lockfile reflects root dependencies only; `next@16.4.6` and `@simplify-dev/*` workspace links are absent; npm does not support the `workspace:` protocol; recommended resolution is exactly the documented root-only exception with `pnpm-lock.yaml` authoritative. This is the source for the ADR-002 Known limitation note.
- `docs/architecture/ADR-002-dual-lockfiles.md:24,70` — existing Decision §1 and Security notes already establish `pnpm-lock.yaml` as authoritative; the new note is consistent, not contradictory.
- `git diff -- docs/architecture/ADR-00*.md` and `git status --short` — only the four leased ADR files were modified by this task. Pre-existing in-flight changes (`package-lock.json`, `packages/cli/src/commands/init.ts`, `packages/cli/test/init.test.ts`, `.agents/`) were left untouched.
- `pnpm exec prettier --check` on the four files — "All matched files use Prettier code style!" (exit 0); no `--write` needed.

## Not updated

- `.agents/decisions/ADR-001…004.md` — originals outside lease; only the transcribed copies in `docs/architecture/` were in scope.
- `TODO.md` — no task-status change requested and outside this narrow lease.
- Verification checkboxes in the ADRs (e.g. ADR-002:74-79) — left as-is; "Keep the rest of the ADR content intact" and out of scope for this status-line task.

## Unverified or ambiguous

- T-014's `package-lock.json` refresh is still uncommitted in the working tree (per `.agents/reports/T-014.md`), so there is no commit hash for it. The ADR-002 status line therefore cites the verified commit `cd9c235` plus the task reference `T-014` rather than inventing a hash.
- `.agents/ledger.yaml` has no T-015 entry (task list ends at T-010); scope was taken from the task brief with its explicit four-file lease.
- Full repository quality gates were not run; only the mandated Prettier check applies to this docs-only change.

## Links and examples checked

- No links or anchors added or removed; changes are status lines plus one prose note.
- Commit hashes in status lines were confirmed to exist via `git show`.
- ADR-002 Known limitation note cross-checked against the T-014 report and the ADR's own authoritative-pnpm statements for internal consistency.

## Next safe action

- Coordinator reviews the four-file diff, decides how to record/disposition the uncommitted T-014 `package-lock.json` refresh, and commits/pushes if approved. This documenter made no commit and pushed nothing.
