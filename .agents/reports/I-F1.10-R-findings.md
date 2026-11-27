# I-F1.10-R — Published layout and missing source asset research

- Task ID: I-F1.10-R
- Role: explore (READ-ONLY)
- Status: COMPLETE
- Scope: registry resolver/client, checked-in registry trees, CLI planner/installer/add/doctor and tests, tooling fixtures, docs/ADRs, and ledger open risks.

## Commands and exact outcomes

- `git ls-files registry` — 14 tracked files: README, `.gitkeep`s, `index.json`, and six versioned `asset.json` manifests. No tracked source files under `registry/**/src/**`.
- `test -e registry/ui/button/@1.0.0/src/button.tsx` — exit `1`.
- `git ls-files "registry/**/*.ts" "registry/**/*.tsx" "registry/**/*.css" "registry/**/*.md"` — no output.
- Read-only manifest scan: `indexAssets=39`, `missingManifests=33`; listed 33 indexed assets with no versioned manifest.
- Read-only installation-file scan: all six tracked manifests declare source-mode files; seven declared source paths are missing (`missingSourceFiles=7`).
- `rg` was unavailable; dedicated `grep` tool was used instead. No files changed by the research agent.

## Observed facts

- Canonical checked-in layout is `registry/<category>/<name>/@<version>/asset.json` (`registry/README.md:3-19`, `ADR-012:12,25`, `packages/registry/test/index.test.ts:24-31`).
- Resolver defines only `source-v1` and rejects unknown layouts with `UNSUPPORTED_ARTIFACT_LAYOUT` (`packages/registry/src/artifact-resolver.ts:5-8,35-43`; test `artifact-resolver.test.ts:35-67`). `RegistryClient` delegates paths to it (`client/index.ts:50-64,197-199`).
- ADR-012:24-30 says to support both source and published `assets/...` during migration, but I-F1.0/I-F1.3 selected source-v1-only with explicit rejection. This is a contract conflict requiring an architectural decision (`I-F1.0-artifact-verification.md:26-28`; `I-F1.3-registry-integration.md:8-9`).
- Missing source files are real installability defects: `SourceInstaller` calls `client.getAssetFile` for non-skipped files (`packages/cli/src/installation/source-installer.ts:972-987`) and maps read failure to `SOURCE_NOT_FOUND` (`:702-720`). Existing tests mock bytes, use dry-run planning, or install `asset.json` instead of declared source files.
- Index/manifest mismatch is broader: 39 index entries, 6 tracked manifests.
- `getAsset` converts `REGISTRY_FILE_NOT_FOUND` to `null` (`packages/registry/src/client/index.ts:130-147`), which can obscure missing manifests.
- Published artifacts are documented as immutable/version-addressable (`docs/architecture/naming-and-identifiers.md:95-109`, `docs/specifications/versioning-and-publication.md:6-19,27-31`), but no on-disk published layout exists; only a versionless tooling fixture advertises `assets/ui/button/manifest.json` (`packages/tooling/test/library-builder.test.ts:15-27`).

## Facts vs decisions

- Fact: source installs for all six tracked manifests would fail on their declared source files.
- Fact: published on-disk layout support is undefined in executable behavior and inconsistent with ADR-012 wording.
- Inference: implementing published layout support now without a decision would invent a contract; an ADR reconciliation is required first.
- Decisions requiring user/architect input: populate real source files vs change manifests/index; published layout support vs source-v1-only; whether index remains a discovery catalogue with only a subset installable; whether planning/doctor should preflight source files.

## Risks

- Real source installs fail with `SOURCE_NOT_FOUND`.
- ADR-012 conflict can lead to incompatible published layout assumptions.
- 33 index entries lack manifests; web/CLI may return index summaries with absent manifests.
- Resolver containment is lexical, not `realpath`-based (separate I-F1.9).

## Next safe action

Ask the user for a product/architecture decision on published layout and registry content scope. I-F1.9 symlink hardening can proceed independently because its repair is unambiguous.
