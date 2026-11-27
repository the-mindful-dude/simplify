# `@simplify-dev/module-registry`

Frontend registry domain module for the web application. It owns the
repository port, query keys/hooks, view models and the only on-disk adapter used
by the web data path. This package is private to the application workspace and
is never published.

It is **not** `apps/registry-api`, the Node webhook receiver.

## Public API

Everything below is exported from `@simplify-dev/module-registry`. Deep imports
are not supported.

- `RegistryRepository` — the read-only port; `getSnapshot(): Promise<RegistrySnapshot>`.
- `registryQueryKeys`, `registrySnapshotQueryOptions`, `useRegistrySnapshot`,
  `useRefreshRegistrySnapshot` — query keys, a shared query definition and
  hooks. Repositories are injected; no global provider or client is created.
- `toAsyncState`, `isRegistrySnapshotEmpty`, `QueryStateLike` — map query state
  to the `AsyncState` contract from `@simplify-dev/module-core`.
- `RegistryDataError`, `RegistryDataErrorCode`, `toRepositoryError` — stable,
  non-sensitive failure codes and normalization into `RepositoryError`.
- `buildRegistrySnapshot`, `toManifestView`, `ManifestLoadResult` — pure view
  mappers. They perform no I/O and no validation.
- View types (`RegistrySnapshot`, `RegistryAssetView`, `ManifestView`,
  `AssetFilters`, `CSSVars`, …) and pure view helpers (`CATEGORY_LABELS`,
  `CATEGORY_ORDER`, `SORT_LABELS`, `statusVariant`, `toTargetView`,
  `formatTargetLabel`, `buildCategoryCounts`, `buildTags`,
  `filterAndSortAssets`, `formatGeneratedAt`).

The root entry is client-safe: it contains no filesystem access, no path
construction and no manifest reads.

## `@simplify-dev/module-registry/server`

The deliberate server-only subpath exports `getRegistrySnapshot` and
`OnDiskRegistryRepository`. It starts with the `server-only` guard, so importing
it from a client component fails the Next.js build.

`OnDiskRegistryRepository` delegates artifact paths, reads, traversal checks and
schema validation to `@simplify-dev/registry`; it does not implement a second
resolver or validator. Invalid or missing manifests become non-sensitive
`ManifestIssue` values while the validated index still renders.

## Boundaries

- Depends on `@simplify-dev/module-core`, `@simplify-dev/registry` and
  `@tanstack/react-query`; no dependency on `modules/app`, published packages,
  GitHub, CLI or the registry API.
- No React components, no `next/*` imports, no design-system imports and no
  native controls.
- Web code consumes the root entry for views and the `./server` subpath only
  from server composition code.

## Scripts

```sh
pnpm --filter @simplify-dev/module-registry test
pnpm --filter @simplify-dev/module-registry typecheck
pnpm --filter @simplify-dev/module-registry lint
pnpm --filter @simplify-dev/module-registry build
```
