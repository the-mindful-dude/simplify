# I-F1.0 — Fresh baseline and registry artifact-layout verification

Owner: coordinator (gates) + explore (read-only verification, task ses_df224fcc6ffeUa73zao9xwP0Yq)

## Fresh baseline (2026-11-24, HEAD 7b2f482)
Command: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

- First attempt failed: Prettier flagged 17 coordinator `.agents/**` files. Fixed with `pnpm exec prettier --write ".agents/**/*.{md,yaml}"` (only `.agents/**`).
- Re-run exit: `BASELINE_EXIT:0`.
- `format:check`: "All matched files use Prettier code style!"
- `lint`: 19/19 Turbo tasks successful (19 cached).
- `typecheck`: 19/19 successful.
- `test`: root Vitest 1 file / 9 tests passed; Turbo 19/19; per-package tests passed (registry 74, cli 205, ui 44, tooling 55, github 27, registry-api 15, tokens 6, etc.).
- `build`: 11/11 successful; Next.js 16.4.6 compiled; 2 known Turbopack warnings for dynamic filesystem access at `apps/web/lib/registry-data.ts:146` and `:160`.

## Artifact-layout verification (read-only)
- Canonical on-disk layout: `registry/<category>/<name>/@<version>/asset.json`. Evidence: `registry/README.md:1-19`, `registry/index.json:4-14`, `registry/ui/button/@1.0.0/asset.json:1-44`, `packages/registry/test/index.test.ts:13-14,24-31,113-136,144-164`.
- 6 versioned manifests tracked; 39 index entries; no `assets/...` artifact tree and no `manifest.json` tracked.
- Defect: `packages/registry/src/client/index.ts:36-44,57-63` builds `<root>/assets/<category>/<assetId>/@<version>/manifest.json`; `assetId` already includes category, producing `assets/ui/ui/button/...`. Runtime probe: `getAsset(ui/button,1.0.0)` returned `null`; `getAssetFile` threw `REGISTRY_FILE_NOT_FOUND` with doubled path.
- Web reads canonical source layout directly via `apps/web/lib/registry-data.ts:62-77,136-187,190-273`; CLI reads through the broken client (`packages/cli/src/installation/planner.ts:152-161`, `commands/add.ts:245-267,387-397`).
- Published layout is only a URL/immutability contract (`docs/architecture/naming-and-identifiers.md:95-109`, `docs/specifications/registry-index.md:35-40`); no on-disk instance exists. A version-less `assets/ui/button/manifest.json` appears only in tooling fixtures (`packages/tooling/test/library-builder.test.ts:15-28`).
- Resolver recommendation: own all path rules in `packages/registry`; source-v1 primary; no category duplication; validate assetId, version, sourcePath, and final containment.

## Decision recorded
- DP5: canonical layout confirmed as source-v1. Published on-disk layout is undefined; F1.3 will implement source-v1 and reject unsupported layouts with actionable errors rather than invent a shape. Open risk recorded; ADR-012 note to be corrected in F1.5.

## Open risks
- CLI source installs cannot fully work from this repo: `registry/ui/button/@1.0.0/asset.json:27-33` declares `src/button.tsx`, but that file is not tracked.
- `getAsset` silently converts ENOENT to `null`; `doctor` checks index only.
- Index/manifest mismatch: 39 vs 6.
- ADR-012 file still literally says `Status: proposed` (ratification pending F1.5 text update).
