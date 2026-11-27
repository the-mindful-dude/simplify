# I-F1.R8 — Final I-F1.11 documentation review

- Task: I-F1.11
- Reviewer: reviewer
- Status: APPROVE after final citation correction
- Scope: ADR-012, `registry/README.md`, `docs/specifications/registry-index.md`.

## Evidence

- ADR-012:27-32 and :35-51 match resolver behavior: only `source-v1`, unknown layouts rejected, `published-v1` deferred with explicit preconditions.
- `registry/README.md:18-38` and `docs/specifications/registry-index.md:38-55` distinguish discovery summaries from installable assets and document the approved I-F1.12 exception.
- Citations were checked against current source/test locations after I-F1.9. The one precision finding at ADR-012:16,32 was corrected to include fixture and assertion ranges.
- Diff is documentation-only and stayed in lease.

## Checks

- `pnpm exec prettier --check .agents/decisions/ADR-012-registry-repository-and-artifact-layout.md registry/README.md docs/specifications/registry-index.md` — passed.
- Coordinator final `pnpm format:check` — passed.

## Residual risks

- Six tracked assets remain non-installable in source mode until I-F1.12; explicitly user-approved and documented.

## Outcome

APPROVE. Changes are committed in `e09addb`.
