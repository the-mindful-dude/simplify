# ADR-012 — RegistryRepository port and one canonical registry artifact layout

- Status: Accepted
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; pre-existing defect from T-P002A:29, T-P002C:42-43

## Context

Observed facts (verified by inspection):

- Checked-in source layout is `registry/<category>/<name>/@<version>/asset.json` (`git ls-files registry` shows e.g. `registry/ui/button/@1.0.0/asset.json`; `packages/registry/test/index.test.ts:25-30` lists the same relative paths).
- `apps/web/lib/registry-data.ts:62-77,136-187` resolves manifests with `resolve(root, assetId, '@'+version, 'asset.json')` and validates them; this matches the checked-in layout.
- `packages/registry/src/client/index.ts:57-63` instead builds `<root>/assets/<category>/<assetId>/@<version>/manifest.json`. Because `assetId` already contains the category (`ui/button`, `registry/index.json:6`), this produces `<root>/assets/ui/ui/button/@1.0.0/manifest.json`, which is both doubled and absent from disk. The behavior is baked into `packages/registry/test/client.test.ts:118-133`.
- `packages/tooling/test/library-builder.test.ts:23-25,66,106` expects a third shape, `assets/ui/button/manifest.json` (no version segment).
- `apps/web/lib/registry-data.ts:1-3,43-59,190-273` performs server-side filesystem access directly in the web application; `T-P002A:29` notes there is no `server-only` guard.
- `AGENTS.md:162,328` require web to consume registry data, not maintain a separate catalogue; `AGENTS.md:196,499` forbid duplicated authoritative logic; `AGENTS.md:154,174` require a stable client interface separated from storage.
- `modules/registry/` is the **frontend feature module**; `apps/registry-api/src/app.ts:3-9,97-160` is the Node webhook receiver and is out of this ADR's scope.

This is a **critical** finding: three competing path conventions for "where a versioned asset manifest lives", with two different filenames (`asset.json` vs `manifest.json`) and inconsistent category/version segments.

## Decision

1. Establish **one authoritative artifact-layout contract** in `@simplify-dev/registry`, owned by `packages/registry`: a pure resolver `resolveRegistryArtifactPath(root, { assetId, version, kind })` plus a typed `RegistryArtifactLayout`. All path construction, version-segment rules and traversal guards live there (`packages/registry/src/client/index.ts:28-34` remains the single safety implementation).
2. Define the canonical source layout as the observed `registry/<category>/<name>/@<version>/asset.json`. Published/distributed layouts may differ; the contract must explicitly name each supported layout and version it, and `RegistryClient` must resolve through the contract rather than hardcoding `assets/<category>/<assetId>/manifest.json` (`client/index.ts:57-63`).
3. `modules/registry` owns the **`RegistryRepository` port** (client-safe root export) and the **real on-disk adapter** behind a deliberate `./server` subpath with a `server-only` guard. The adapter calls `@simplify-dev/registry`'s client/resolver; it must not implement a second filesystem path builder or re-validate manifests independently of `@simplify-dev/registry`.
4. Other domains' fixtures implement their own narrow repository ports; a minimal generic fixture helper may live in `modules/core` only if ≥2 domains need it (proven duplication), and never reads the filesystem in production builds.
5. `apps/web/lib/registry-data.ts:190-273` moves behind the port: first become a thin re-export of the adapter (transition commit), then be deleted. `apps/web` keeps only server composition and the view mapping it truly owns (`lib/catalog.ts`, `lib/types.ts` move to `modules/registry` view layer when the domain module lands).
6. Backward compatibility: during migration the resolver supports both the observed source layout and the published `assets/...` layout; the doubled `assets/<category>/<assetId>` path is treated as a defect to fix in `RegistryClient` with updated tests (`client.test.ts:118-133` must change with a clear justification — it currently enshrines the wrong path). CLI `getAsset`/`getAssetFile` consumers (`T-P002C:43`) must be verified read-only before the fix and covered by contract tests.
7. This changes no published package API surface beyond an additive resolver; it changes internal path behavior and therefore requires explicit migration and verification, not a silent rewrite.

## Alternatives considered

| Alternative                                                                         | Why rejected                                                                                                               |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Keep both readers (web FS code + RegistryClient)                                    | Two competing authoritative path rules; the CLI path is already broken against checked-in data; violates single-ownership. |
| Move web FS code verbatim into `modules/registry` and leave `RegistryClient` broken | Preserves the defect and gives the frontend module a second registry client; rejected.                                     |
| Change RegistryClient tests to match the current doubled path                       | Enshrines a bug; contradicts the checked-in registry and the CLI's purpose.                                                |
| Let each domain read files directly                                                 | Duplicates path/traversal/validation logic in five modules; unacceptable.                                                  |
| Fix layout only in `apps/registry-api`                                              | Wrong boundary: that service is a webhook receiver (`package.json:26-28`) and is not the web data path.                    |

## Consequences

Positive: one path authority, one validation authority, one web data entry, server-only I/O, CLI and web converge.

Negative: requires a fix in a published package (`@simplify-dev/registry`) and updated tests/fixtures; migration must be staged; layout compatibility shim has a removal condition.

Neutral: `apps/registry-api` and GitHub integration untouched; no change to asset identity or manifest schema.

## Boundary and dependency impact

Added: `modules/registry -> @simplify-dev/registry`; `apps/web -> modules/registry` (root for hooks, `./server` for prefetch only in server components). Removed: `apps/web -> node:fs` registry reads once migration completes. Changed: `packages/registry/src/client/index.ts` path resolution and its tests. No edge to or from `apps/registry-api`, `packages/github`, `packages/cli` beyond the shared client fix; CLI behavior is verified, not redesigned.

## Migration plan (each step keeps the system working)

1. Read-only verification: reproduce which paths `RegistryClient.getAsset`/`getAssetFile` use for a checked-in asset and record the result before any code change (owned by the remediation task).
2. Add the additive layout resolver and contract tests in `packages/registry`; keep existing client behavior until tests are green.
3. Switch `RegistryClient` to the resolver; update `client.test.ts` with justification; add a CLI consumption test.
4. Add `modules/registry` port + server adapter using the corrected client; web uses a thin re-export shim of `registry-data.ts` to the adapter.
5. Delete the duplicated web FS/path logic; remove the shim in a later commit once all call sites are migrated.
6. Rollback: revert the step commit. Because the resolver is additive until step 3 and the web shim is thin, each earlier step is independently reversible.

## Risks

| Risk                                                         | Likelihood | Impact | Mitigation                                                                                    | Owner                   |
| ------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------- | ----------------------- |
| Published artifacts use a layout not observed in `registry/` | medium     | high   | Step 1 verification; versioned layout contract; support both layouts during migration         | architect + implementer |
| CLI breaks after path fix                                    | medium     | high   | Contract test with real checked-in asset before and after; staged rollback                    | implementer             |
| `./server` adapter imported into a client bundle             | medium     | high   | `server-only` guard + ESLint rule forbidding `module-registry/server` in `'use client'` files | foundation              |
| Fixtures leak to production                                  | low        | medium | Fixtures test-only; no production import path; boundary check                                 | reviewer                |

## Verification

- One resolver implementation; zero `join(..., 'assets', ...)` path builders outside `packages/registry`.
- Server adapter is the only web-side filesystem path; `apps/web/lib/registry-data.ts` no longer contains FS reads after migration.
- Tests prove CLI and web resolve the same checked-in asset; `server-only` import boundary test passes.
