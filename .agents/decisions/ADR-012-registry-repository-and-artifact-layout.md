# ADR-012 — RegistryRepository port and one canonical registry artifact layout

- Status: Accepted
- Date: 2026-11-23
- Amended: 2026-11-27 — reconciled to the implemented `source-v1`-only resolver
  (`.agents/decisions/DECISION-FE-FOUNDATION-003.md`); status remains Accepted.
- Owners: architect
- Related tasks: T-P004, T-P005; pre-existing defect from T-P002A:29, T-P002C:42-43

## Context

Observed facts (verified by inspection):

- Checked-in source layout is `registry/<category>/<name>/@<version>/asset.json` (`git ls-files registry` shows e.g. `registry/ui/button/@1.0.0/asset.json`; `packages/registry/test/index.test.ts:25-30` lists the same relative paths).
- Manifest resolution is now delegated from the web compatibility shim to the server adapter: `apps/web/lib/registry-data.ts:1-5` re-exports `@simplify-dev/module-registry/server`, and `modules/registry/src/server/repository.ts:87-107` resolves each manifest through `RegistryArtifactResolver` and `RegistryClient`.
- Before the resolver migration, `RegistryClient` built `<root>/assets/<category>/<assetId>/@<version>/manifest.json`. Because `assetId` already contains the category (`ui/button`, `registry/index.json:6`), this produced `<root>/assets/ui/ui/button/@1.0.0/manifest.json`, which was both doubled and absent from disk. The current client delegates path resolution and read-path containment to `RegistryArtifactResolver` (`packages/registry/src/client/index.ts:39-45,47-73`), and `packages/registry/test/client.test.ts:120-145,180-183,272` asserts source-v1 paths.
- `packages/tooling/test/library-builder.test.ts:23-25,66,106` expects a third shape, `assets/ui/button/manifest.json` (no version segment).
- The `assets/...` paths above are defective paths being replaced, not supported layouts. No published on-disk artifact tree exists in this repository.
- Web filesystem access now lives behind the guarded server adapter: `apps/web/lib/registry-data.ts:1-5` is a thin re-export, `modules/registry/src/server/index.ts:1-6` declares `import 'server-only'`, and `modules/registry/src/server/repository.ts:1-10,37-55` delegates path and validation rules to `@simplify-dev/registry`.
- `AGENTS.md:171,211` require web to consume registry data, not maintain a separate catalogue, and forbid duplicated business logic; `AGENTS.md:189,191` require infrastructure details to stay out of domain contracts and consumption through small stable interfaces.
- `modules/registry/` is the **frontend feature module**; `apps/registry-api/src/app.ts:3-9,97-160` is the Node webhook receiver and is out of this ADR's scope.

This is a **critical** finding: three competing path conventions for "where a versioned asset manifest lives", with two different filenames (`asset.json` vs `manifest.json`) and inconsistent category/version segments.

## Decision

1. Establish **one authoritative artifact-layout contract** in `@simplify-dev/registry`, owned by `packages/registry`: `RegistryArtifactResolver` plus a typed `RegistryArtifactLayout` with exactly one member, `source-v1` (`packages/registry/src/artifact-resolver.ts:6-9,36-44`). The resolver owns path construction, version-segment rules, lexical validation, and authoritative real-path containment via `realpathSync` (`:109-136,166-207`); any other layout discriminator is rejected by design with `UNSUPPORTED_ARTIFACT_LAYOUT` (`:126-133`).
2. Define the canonical source layout as the observed `registry/<category>/<name>/@<version>/asset.json`. No published on-disk layout is defined or supported by this ADR; published distribution is URL-based and independent of an on-disk source layout (`docs/architecture/naming-and-identifiers.md:95-109`). `RegistryClient` must resolve through the contract rather than hardcode `assets/<category>/<assetId>/manifest.json`; that former client path-builder was the defective path.
3. `modules/registry` owns the **`RegistryRepository` port** (client-safe root export) and the **real on-disk adapter** behind a deliberate `./server` subpath with a `server-only` guard. The adapter calls `@simplify-dev/registry`'s client/resolver; it must not implement a second filesystem path builder or re-validate manifests independently of `@simplify-dev/registry`.
4. Other domains' fixtures implement their own narrow repository ports; a minimal generic fixture helper may live in `modules/core` only if ≥2 domains need it (proven duplication), and never reads the filesystem in production builds.
5. The former web FS/path logic moves behind the port: `apps/web/lib/registry-data.ts:1-5` is now a thin re-export of the adapter; deletion is a later step once all call sites are migrated. `apps/web` keeps only server composition and the view mapping it truly owns (`lib/catalog.ts`, `lib/types.ts` move to `modules/registry` view layer when the domain module lands).
6. No backward-compatibility shim: the resolver defines only `source-v1`, and unknown layouts — including `published-v1` and any `assets/...` discriminator — are rejected with `UNSUPPORTED_ARTIFACT_LAYOUT`. The doubled `assets/<category>/<assetId>` client path and the versionless `assets/ui/button/manifest.json` tooling-fixture path are defective paths being replaced, not compatible layouts. `RegistryClient` dropped them (`packages/registry/test/client.test.ts:120-145,180-183,272` asserts source-v1 paths). CLI `getAsset`/`getAssetFile` consumption is covered by `packages/cli/test/registry-path-consumption.test.ts:75-129` with the real `RegistryClient` and the checked-in `ui/button@1.0.0` manifest.
7. This changes no published package API surface beyond an additive resolver; it changes internal path behavior and therefore requires explicit migration and verification, not a silent rewrite.

## Deferred published-v1

`published-v1` is deferred. This ADR does not define or implement a published on-disk
layout, and the resolver rejects any layout other than `source-v1`. A later ADR may
supersede this decision and define `published-v1` only when all of the following hold:

1. A superseding ADR specifies the on-disk artifact format, versioning, and migration
   from `source-v1`.
2. Real immutable published artifacts exist on disk, not just URL metadata or fixtures.
3. A publication pipeline produces and validates those artifacts for each release.
4. A provenance and integrity contract records repository identity, commit SHA, version,
   timestamp, artifact reference, and integrity metadata.
5. Contract tests cover the resolver, `RegistryClient`, CLI, and web consumers against a
   real published artifact.

Until these preconditions are met, documentation and tooling must treat published
on-disk layouts as unspecified.

## Alternatives considered

| Alternative                                                                         | Why rejected                                                                                                               |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Keep both readers (web FS code + RegistryClient)                                    | Two competing authoritative path rules; the CLI path is already broken against checked-in data; violates single-ownership. |
| Move web FS code verbatim into `modules/registry` and leave `RegistryClient` broken | Preserves the defect and gives the frontend module a second registry client; rejected.                                     |
| Change RegistryClient tests to match the current doubled path                       | Enshrines a bug; contradicts the checked-in registry and the CLI's purpose.                                                |
| Let each domain read files directly                                                 | Duplicates path/traversal/validation logic in five modules; unacceptable.                                                  |
| Fix layout only in `apps/registry-api`                                              | Wrong boundary: that service is a webhook receiver (`apps/registry-api/package.json:26-28`) and is not the web data path.  |

## Consequences

Positive: one path authority, one validation authority, one web data entry, server-only I/O, CLI and web converge.

Negative: requires a fix in a published package (`@simplify-dev/registry`) and updated tests/fixtures; migration must be staged; there is no layout compatibility shim and unknown layouts are rejected by design.

Neutral: `apps/registry-api` and GitHub integration untouched; no change to asset identity or manifest schema.

## Boundary and dependency impact

Added: `modules/registry -> @simplify-dev/registry`; `apps/web -> modules/registry` (root for hooks, `./server` for prefetch only in server components). Removed: `apps/web -> node:fs` registry reads once migration completes. Changed: `packages/registry/src/client/index.ts` path resolution and its tests. No edge to or from `apps/registry-api`, `packages/github`, `packages/cli` beyond the shared client fix; CLI consumption is covered by `packages/cli/test/registry-path-consumption.test.ts:75-129`, not redesigned.

## Migration plan (each step keeps the system working)

1. Read-only verification: reproduce which paths `RegistryClient.getAsset`/`getAssetFile` use for a checked-in asset and record the result before any code change (owned by the remediation task).
2. Add the additive layout resolver and contract tests in `packages/registry`; keep existing client behavior until tests are green.
3. Switch `RegistryClient` to the resolver; update `client.test.ts` with justification; add a CLI consumption test.
4. Add `modules/registry` port + server adapter using the corrected client; web uses a thin re-export shim of `registry-data.ts` to the adapter.
5. Delete the duplicated web FS/path logic; remove the shim in a later commit once all call sites are migrated.
6. Rollback: revert the step commit. Because the resolver is additive until step 3 and the web shim is thin, each earlier step is independently reversible.

## Risks

| Risk                                                         | Likelihood | Impact | Mitigation                                                                                                               | Owner                   |
| ------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Published artifacts use a layout not observed in `registry/` | medium     | high   | No published layout is assumed; resolver rejects unknown layouts; a superseding ADR is required before implementation    | architect + implementer |
| CLI breaks after path fix                                    | medium     | high   | Contract test with real checked-in asset (`packages/cli/test/registry-path-consumption.test.ts:75-129`); staged rollback | implementer             |
| `./server` adapter imported into a client bundle             | medium     | high   | `server-only` guard + ESLint rule forbidding `module-registry/server` in `'use client'` files                            | foundation              |
| Fixtures leak to production                                  | low        | medium | Fixtures test-only; no production import path; boundary check                                                            | reviewer                |

## Verification

- One resolver implementation; zero `join(..., 'assets', ...)` path builders outside `packages/registry`.
- `RegistryArtifactResolver` accepts only `source-v1`; every other layout discriminator throws `UNSUPPORTED_ARTIFACT_LAYOUT`.
- Server adapter is the only web-side filesystem path; `apps/web/lib/registry-data.ts:1-5` is a thin re-export with no FS reads, checked by `modules/registry/test/server-boundary.test.ts:59-71`.
- CLI consumption of the checked-in `ui/button@1.0.0` manifest is covered by `packages/cli/test/registry-path-consumption.test.ts:75-129`; the `server-only` boundary and web shims are covered separately by `modules/registry/test/server-boundary.test.ts:22-72`.
