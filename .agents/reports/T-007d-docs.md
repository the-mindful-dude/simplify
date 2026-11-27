# Documentation — T-007d

status: complete

## Updated

- `docs/architecture/README.md` — added the four ADRs to the existing Reading Order list (items 9–12) and Status table (rows marked `Accepted`, matching each ADR's declared status). Prettier reflowed the Status table column widths as a consequence of the longer ADR-003 filename; no other content changed.
- `TODO.md` — added a concise `## Verified Status (2026-11-19)` block attributing toolchain (`66afa11`), Phase 9 (`339086b`), tokens/UI (`4271bad`), and registry browser (`f548e28`) work to verified commits, recording the passing gates and the Phase 8 blocker. Annotated the corresponding phase/section headings (Phase 9, 11, 12, 15.1, 15.4) with their commit hashes and added an explicit open/blocked note under Phase 8. One clarifying sentence states that completion is recorded at phase/section granularity and detailed checklists are retained as the original planning breakdown. No sub-checkbox was flipped and no open work was removed.

## Verified against

- `docs/architecture/` directory listing — all four ADR files exist with the exact names used in the index.
- `docs/architecture/ADR-001-next16-react19-upgrade.md:1-4` — title and `Status: Accepted`; subject is Next 16.4.6 / React 19 and the Node floor.
- `docs/architecture/ADR-002-dual-lockfiles.md:1-4,20-29` — title and `Status: Accepted`; pnpm-primary with both lockfiles tracked.
- `docs/architecture/ADR-003-canonical-tokens-and-ui-contracts.md:1-4,23-44` — title and `Status: Accepted`; canonical tokens and `packages/ui` contracts.
- `docs/architecture/ADR-004-phase9-scope-and-tooling.md:1-4,19-44` — title and `Status: Accepted`; Phase 9 scope, tooling baseline, Radix/DOM testing, responsive API.
- `git log --oneline -12` — commits `66afa11`, `339086b`, `4271bad`, `f548e28` exist on `feat/phase-9-complete-premium-ui` with the messages cited in the task brief.
- `git show --stat <commit>` for all four commits — confirms the changed-file scopes used in the TODO annotations: `66afa11` toolchain/lockfile/framework config; `339086b` CLI installation modules, `phase9-operations.test.ts`, `doctor.ts` and pre-existing test/lint fixes; `4271bad` token source/generators/outputs and all 17 `packages/ui` components with tests; `f548e28` `apps/web` registry browser components/styles plus the UI CSS copy build.
- `.agents/ledger.yaml:20-226` — T-001, T-003, T-004, T-005, T-006, T-007 map to the cited commits; Phase 8 is skipped because GitHub credentials are unavailable.
- Task brief — supplied gate results (`format:check`, `lint`, `typecheck`, `test`, `build`, dev `GET /` 200) and the Phase 8 credential/secrets blocker. These were reported as already verified by the coordinator; I did not re-run them in this documentation-only task.

## Not updated

- All ADR files — their content was not in the T-007d lease, and their own status lines already say `Accepted`.
- `AGENTS.md`, `docs/MODEL.md`, `docs/architecture/technical-standards.md` — not affected by this task; editing them is outside the lease.
- Phase 8 sub-items in `TODO.md` — deliberately left unchecked; the phase is blocked, not complete.
- Detailed checkbox items under the annotated phases — left unchanged to avoid asserting completion of individual sub-items that were not individually verified in this task. The phase/section annotations plus the Verified Status block are the documented completion boundary.
- No source, test, configuration, manifest, or build file was touched.

## Unverified or ambiguous

- The ADR status lines say "pending implementation and transcription to `docs/architecture/`" while the files are now located in `docs/architecture/`. I did not edit them (outside lease) and used their declared `Accepted` status in the index. Coordinator should decide whether to retire that stale parenthetical in a follow-up.
- I did not personally re-run the repository quality gates or the dev smoke test; gate results come from the task brief and ledger evidence. Only the mandated Prettier check was executed here.
- AGENTS.md §8.4 says subagents must not modify `TODO.md`, while this task brief explicitly delegates the TODO correction to the documenter with a lease on `TODO.md`. I followed the explicit delegation and flag the rule tension for the coordinator.
- The task lease names only the two documentation files; this report is the role-mandated handoff artifact under `.agents/reports/`, consistent with the existing `T-007c-docs.md` precedent. No other file was written.

## Links and examples checked

- All nine `./…` links in `docs/architecture/README.md` — resolved on disk; no broken links. No new heading anchors were introduced.
- Reading-order entries 9–12 use the same numbered link + em-dash description style as entries 1–8.
- Status table uses the existing `Document | Status` schema; `Accepted` matches the four ADRs' own status lines.
- TODO commit references — each hash and scope cross-checked against `git log` and `git show --stat` as listed above.

- Prettier check, **before** formatting:

  ```
  Checking formatting...
  [warn] docs/architecture/README.md
  [warn] Code style issues found in the above file. Run Prettier with --write to fix.
  ```

  Exit code `1` (`TODO.md` was already clean).

- `pnpm exec prettier --write docs/architecture/README.md TODO.md` — exit code `0`; output:

  ```
  docs/architecture/README.md 140ms
  TODO.md 1039ms (unchanged)
  ```

- Required re-check, `pnpm exec prettier --check docs/architecture/README.md TODO.md` — exact outcome:
  ```
  Checking formatting...
  All matched files use Prettier code style!
  ```
  Exit code `0`.

## Next safe action

- Coordinator reviews `git diff -- docs/architecture/README.md TODO.md`; only those two tracked files are modified. Decide whether to flip the detailed sub-checkboxes for the annotated phases and whether to clean the stale "pending transcription" parenthetical in the four ADR status lines (both outside this lease).

## Git state

- Both edits are **uncommitted**. Nothing was committed, pushed, or staged. `git status --short` shows ` M TODO.md` and ` M docs/architecture/README.md`; all other listed paths were already untracked/modified before this task and were left untouched.
