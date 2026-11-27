# I-F1.10-A — Architecture recommendation for ADR-012 and registry content gaps

- Task ID: I-F1.10-A
- Role: architect (READ-ONLY)
- Status: COMPLETE
- Scope: ADR-012 published-layout wording, resolver contract, registry index/manifest/source-file consistency.

## Commands and evidence

- Read `AGENTS.md`, `.agents/reports/I-F1.10-R-findings.md`, ADR-012, resolver/client, registry docs, and product/architecture sources. No files changed.
- `git ls-files registry` — 6 versioned manifests, `index.json`, README, `.gitkeep`s; no `src/**`.
- Manifest scan — 7 declared source files, all absent.
- `registry/index.json:4-395` — 39 asset summaries; `:396-535` — 7 libraries.
- ADR-012:3 Accepted; `:14` records the `assets/...` path as a doubled/absent defect; `:25,29` promise dual source/published support.
- `packages/registry/src/artifact-resolver.ts:5-8,35-43,113-120` — only `source-v1`; unknown layouts rejected.
- `docs/architecture/naming-and-identifiers.md:95-109` — published contract is URL-based.
- `packages/cli/src/installation/source-installer.ts:972-977,702-720` — missing declared sources cause `SOURCE_NOT_FOUND`.

## Facts vs judgment

- Fact: ADR-012 wording diverges from the implemented and previously approved source-v1-only contract.
- Fact: no published artifact tree, format, provenance record, or publication pipeline exists.
- Judgment: implementing published-v1 now would invent and enshrine an untestable contract and conflict with the product's URL-based publication contract.
- Judgment: index entries are discovery summaries; a 39-vs-6 gap is acceptable when documented.
- Judgment: missing declared source files are a real defect, but their implementation is asset-content work.

## Recommendation

Option A: reconcile ADR-012 to source-v1-only, reject unknown layouts by design, and defer published-v1 until its preconditions exist. Document index discovery semantics and present-source installability. Track missing sources as an approved later-phase exception.

Alternatives rejected: implement published-v1 now (no contract or artifacts); leave ADR divergent (contract violation); trim index (unnecessary catalogue change).

## User decision

The user approved Option A and approved adding real source files in a later asset phase. Recorded in `.agents/decisions/DECISION-FE-FOUNDATION-003.md`.

## Next safe action

Delegate I-F1.9 path hardening and I-F1.11 documentation reconciliation in parallel; open I-F1.12 as a later-phase source-content task.
