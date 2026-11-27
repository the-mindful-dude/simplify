export { RegistryDataError, toRepositoryError } from './errors.js';
export type { RegistryDataErrorCode } from './errors.js';

export type { RegistryRepository } from './port.js';

export { registryQueryKeys } from './queries/keys.js';
export { registrySnapshotQueryOptions } from './queries/options.js';
export { useRefreshRegistrySnapshot, useRegistrySnapshot } from './queries/hooks.js';

export { isRegistrySnapshotEmpty, toAsyncState } from './state.js';
export type { QueryStateLike } from './state.js';

export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SORT_LABELS,
  buildCategoryCounts,
  buildTags,
  filterAndSortAssets,
  formatGeneratedAt,
  formatTargetLabel,
  statusVariant,
  toTargetView,
} from './view/catalog.js';
export type { StatusVariant } from './view/catalog.js';

export { buildRegistrySnapshot, toManifestView } from './view/mappers.js';
export type { ManifestLoadResult } from './view/mappers.js';

export type {
  AssetCategory,
  AssetFilters,
  AssetStatus,
  CategoryCount,
  CSSVars,
  DocumentationView,
  ImplementationView,
  InstallationFileView,
  InstallationModeView,
  ManifestIssue,
  ManifestView,
  PackageDependencyView,
  RegistryAssetView,
  RegistryDependencyView,
  RegistryLibraryView,
  RegistrySnapshot,
  SortKey,
  TargetView,
} from './view/types.js';
