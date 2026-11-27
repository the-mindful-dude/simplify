import type { CSSProperties } from 'react';

/** The six asset categories declared by the registry schema. */
export type AssetCategory = 'ui' | 'blocks' | 'logic' | 'integrations' | 'recipes' | 'templates';

/** The publication states declared by the registry schema. */
export type AssetStatus = 'official' | 'community' | 'verified' | 'deprecated' | 'compromised';

/** A serializable implementation target, derived from a real manifest or index entry. */
export interface TargetView {
  readonly language: string;
  readonly framework?: string;
  readonly runtime?: string;
  readonly label: string;
}

/** A serializable implementation entry from an asset manifest. */
export interface ImplementationView {
  readonly id: string;
  readonly mode: string;
  readonly entry: string;
  readonly targetLabel: string;
}

/** A registry dependency declared by an asset manifest. */
export interface RegistryDependencyView {
  readonly id: string;
  readonly version: string;
  readonly optional: boolean;
  readonly reason?: string;
}

/** A package dependency declared by an asset manifest. */
export interface PackageDependencyView {
  readonly name: string;
  readonly version: string;
  readonly kind: string;
}

/** A declared source-to-target file mapping for an installation mode. */
export interface InstallationFileView {
  readonly source: string;
  readonly target: string;
}

/** A declared installation mode for an asset. */
export interface InstallationModeView {
  readonly mode: string;
  readonly packageName?: string;
  readonly files: readonly InstallationFileView[];
}

/** Documentation references declared by an asset manifest. */
export interface DocumentationView {
  readonly readme?: string;
  readonly examples: readonly string[];
  readonly changelog?: string;
}

/**
 * Detailed data from a versioned `asset.json` manifest. It is present only when
 * the local registry source ships a detailed manifest for the asset.
 */
export interface ManifestView {
  readonly sourcePath: string;
  readonly license: string;
  readonly implementations: readonly ImplementationView[];
  readonly registryDependencies: readonly RegistryDependencyView[];
  readonly packageDependencies: readonly PackageDependencyView[];
  readonly installation: readonly InstallationModeView[];
  readonly documentation: DocumentationView;
  readonly previewScenarios: readonly string[];
}

/** Everything the browser needs to render one real registry asset. */
export interface RegistryAssetView {
  readonly id: string;
  readonly category: AssetCategory;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly publisher: string;
  readonly status: AssetStatus;
  readonly targets: readonly TargetView[];
  readonly libraryIds: readonly string[];
  readonly tags: readonly string[];
  readonly manifest: ManifestView | null;
  readonly sourcePath: string;
}

/** Everything the browser needs to render one real library from the index. */
export interface RegistryLibraryView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly publisher: string;
  readonly assetIds: readonly string[];
}

/** A category and the number of real assets in it. */
export interface CategoryCount {
  readonly category: AssetCategory;
  readonly label: string;
  readonly count: number;
}

/** Stable, non-sensitive reason a versioned asset manifest could not be used. */
export interface ManifestIssue {
  readonly kind: 'invalid' | 'absent';
  readonly assetId: string;
  readonly detail: string;
}

/** A fully materialized, serializable view of the local registry source. */
export interface RegistrySnapshot {
  readonly generatedAt: string;
  readonly schemaVersion: number;
  readonly assets: readonly RegistryAssetView[];
  readonly libraries: readonly RegistryLibraryView[];
  readonly categoryCounts: readonly CategoryCount[];
  readonly manifestCount: number;
  readonly sourceFiles: readonly string[];
  readonly manifestIssues: readonly ManifestIssue[];
}

export type SortKey = 'name' | 'category' | 'version';

/** All client-controlled browser filters. */
export interface AssetFilters {
  readonly query: string;
  readonly category: AssetCategory | 'all';
  readonly libraryId: string | 'all';
  readonly sort: SortKey;
}

/** Inline styles carrying token-driven custom properties such as stagger delays. */
export type CSSVars = CSSProperties & { [key: `--${string}`]: string | number };
