import type { AssetManifest, ImplementationTarget, RegistryIndex } from '@simplify-dev/registry';

import { buildCategoryCounts, buildTags, toTargetView } from './catalog.js';
import type {
  DocumentationView,
  InstallationModeView,
  ManifestIssue,
  ManifestView,
  RegistryAssetView,
  RegistrySnapshot,
} from './types.js';

const INDEX_SOURCE_PATH = 'registry/index.json';

/** Outcome of reading one versioned manifest, supplied by the repository adapter. */
export interface ManifestLoadResult {
  readonly assetId: string;
  readonly view: ManifestView | null;
  readonly issue: ManifestIssue | null;
}

/** Derive a serializable manifest view from a validated asset manifest. */
export function toManifestView(manifest: AssetManifest, sourcePath: string): ManifestView {
  const documentation: DocumentationView = {
    ...(manifest.documentation?.readme ? { readme: manifest.documentation.readme } : {}),
    examples: manifest.documentation?.examples ? [...manifest.documentation.examples] : [],
    ...(manifest.documentation?.changelog ? { changelog: manifest.documentation.changelog } : {}),
  };

  const installation: readonly InstallationModeView[] = (manifest.installation?.modes ?? []).map(
    (mode) => ({
      mode: mode.mode,
      ...(mode.packageName ? { packageName: mode.packageName } : {}),
      files: (mode.files ?? []).map((file) => ({ source: file.source, target: file.target })),
    }),
  );

  return {
    sourcePath,
    license: manifest.license,
    implementations: manifest.implementations.map((implementation) => ({
      id: implementation.id,
      mode: implementation.mode,
      entry: implementation.entry,
      targetLabel: formatImplementationTarget(implementation.target),
    })),
    registryDependencies: (manifest.dependencies?.registry ?? []).map((dependency) => ({
      id: dependency.id,
      version: dependency.version,
      optional: dependency.optional ?? false,
      ...(dependency.reason ? { reason: dependency.reason } : {}),
    })),
    packageDependencies: (manifest.dependencies?.packages ?? []).map((dependency) => ({
      name: dependency.name,
      version: dependency.version,
      kind: dependency.kind,
    })),
    installation,
    documentation,
    previewScenarios: manifest.preview?.scenarios ? [...manifest.preview.scenarios] : [],
  };
}

function formatImplementationTarget(target: ImplementationTarget): string {
  return [target.language, target.framework, target.runtime, target.platform]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' · ');
}

/**
 * Combine a validated index with preloaded manifest outcomes into the stable
 * snapshot consumed by the browser. This function performs no I/O and does no
 * validation: both happen at the repository boundary.
 */
export function buildRegistrySnapshot(
  index: RegistryIndex,
  manifests: readonly ManifestLoadResult[],
): RegistrySnapshot {
  const libraryIdsByAsset = new Map<string, string[]>();
  for (const library of index.libraries) {
    for (const assetId of library.assets) {
      const current = libraryIdsByAsset.get(assetId) ?? [];
      current.push(library.id);
      libraryIdsByAsset.set(assetId, current);
    }
  }

  const manifestByAsset = new Map(manifests.map((load) => [load.assetId, load]));
  const sourceFiles = [INDEX_SOURCE_PATH];
  const manifestIssues: ManifestIssue[] = [];
  const assets: RegistryAssetView[] = [];

  for (const asset of index.assets) {
    const load = manifestByAsset.get(asset.id);
    const manifest = load?.view ?? null;
    if (manifest) {
      sourceFiles.push(manifest.sourcePath);
    }
    if (load?.issue) {
      manifestIssues.push(load.issue);
    }

    const targets = asset.targets.map((target) => toTargetView(target));
    assets.push({
      id: asset.id,
      category: asset.category,
      name: asset.name,
      description: asset.description,
      version: asset.version,
      publisher: asset.publisher,
      status: asset.status,
      targets,
      libraryIds: libraryIdsByAsset.get(asset.id) ?? [],
      tags: buildTags(targets),
      manifest,
      sourcePath: INDEX_SOURCE_PATH,
    });
  }

  const libraries = index.libraries.map((library) => ({
    id: library.id,
    name: library.name,
    description: library.description,
    version: library.version,
    publisher: library.publisher,
    assetIds: [...library.assets],
  }));

  return {
    generatedAt: index.generatedAt,
    schemaVersion: index.schemaVersion,
    assets,
    libraries,
    categoryCounts: buildCategoryCounts(assets),
    manifestCount: assets.filter((asset) => asset.manifest !== null).length,
    sourceFiles,
    manifestIssues,
  };
}
