import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import {
  RegistryClient,
  validateAssetManifest,
  validateRegistryIndex,
} from '@simplify-dev/registry';
import type { AssetManifest, ImplementationTarget } from '@simplify-dev/registry';

import { buildCategoryCounts, buildTags, toTargetView } from './catalog';
import type {
  DocumentationView,
  InstallationModeView,
  ManifestIssue,
  ManifestView,
  RegistryAssetView,
  RegistryDataErrorCode,
  RegistryLibraryView,
  RegistrySnapshot,
} from './types';

const ASSET_ID_PATTERN = /^(ui|blocks|logic|integrations|recipes|templates)\/[a-z0-9][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Raised when the local registry source cannot be turned into a usable snapshot. */
export class RegistryDataError extends Error {
  readonly code: RegistryDataErrorCode;

  constructor(code: RegistryDataErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RegistryDataError';
    this.code = code;
  }
}

/**
 * Locate the repository registry directory from the current working directory.
 * This works both for `next dev` (cwd = apps/web) and for build-time static
 * generation, without embedding an absolute path in the application.
 */
function findRegistryRoot(): { root: string; repoRoot: string } {
  let current = process.cwd();
  for (;;) {
    if (existsSync(join(current, 'registry', 'index.json'))) {
      return { root: join(current, 'registry'), repoRoot: current };
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  throw new RegistryDataError(
    'registry_source_not_found',
    'Could not locate registry/index.json. Expected the repository registry source to be available.',
  );
}

/** Resolve and validate a manifest path before any filesystem access. */
function manifestPath(
  root: string,
  assetId: string,
  version: string,
): { target: string | null; issue: string | null } {
  // Messages are kept free of input values so an untrusted index cannot inject
  // content into the public issue list.
  if (!ASSET_ID_PATTERN.test(assetId) || !VERSION_PATTERN.test(version)) {
    return { target: null, issue: 'invalid asset id or version format' };
  }
  const target = resolve(root, assetId, `@${version}`, 'asset.json');
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    return { target: null, issue: 'manifest path escapes the registry root' };
  }
  return { target, issue: null };
}

function toPosixPath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/');
}

/** Derive a serializable manifest view from a validated asset manifest. */
function toManifestView(manifest: AssetManifest, sourcePath: string): ManifestView {
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
 * Load a detailed manifest when the local source ships one. An invalid or
 * unreadable manifest is recorded as an issue rather than aborting the page;
 * the index summary is still real, renderable data.
 */
async function loadManifest(
  root: string,
  repoRoot: string,
  assetId: string,
  version: string,
): Promise<{ view: ManifestView | null; issue: ManifestIssue | null }> {
  const { target, issue: pathIssue } = manifestPath(root, assetId, version);
  if (pathIssue) {
    return { view: null, issue: { kind: 'invalid', assetId, detail: pathIssue } };
  }
  if (!target || !existsSync(target)) {
    return {
      view: null,
      issue: {
        kind: 'absent',
        assetId,
        detail: `no versioned manifest at ${assetId}/@${version}/asset.json`,
      },
    };
  }

  const sourcePath = toPosixPath(repoRoot, target);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(target, 'utf8')) as unknown;
  } catch {
    // Do not echo parser errors: they can contain absolute paths and snippets.
    return {
      view: null,
      issue: {
        kind: 'invalid',
        assetId,
        detail: `${sourcePath}: manifest JSON could not be parsed`,
      },
    };
  }

  const validation = validateAssetManifest(raw);
  if (!validation.valid || !validation.value) {
    const firstIssue = validation.issues[0];
    return {
      view: null,
      issue: {
        kind: 'invalid',
        assetId,
        detail: `${sourcePath}: invalid manifest (${firstIssue ? `${firstIssue.path} ${firstIssue.message}` : 'schema validation failed'})`,
      },
    };
  }

  return { view: toManifestView(validation.value, sourcePath), issue: null };
}

/** Read, validate and materialize the entire local registry source. */
export async function getRegistrySnapshot(): Promise<RegistrySnapshot> {
  const { root, repoRoot } = findRegistryRoot();
  const client = new RegistryClient({ registryRoot: root });

  let rawIndex: unknown;
  try {
    rawIndex = await client.getRegistryIndex();
  } catch (error) {
    throw new RegistryDataError(
      'index_read_failed',
      `Failed to read the registry index: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  const validation = validateRegistryIndex(rawIndex);
  if (!validation.valid || !validation.value) {
    const firstIssue = validation.issues[0];
    throw new RegistryDataError(
      'index_invalid',
      `registry/index.json failed schema validation (${firstIssue ? `${firstIssue.path} ${firstIssue.message}` : 'unknown issue'}).`,
    );
  }
  const index = validation.value;

  const libraryIdsByAsset = new Map<string, string[]>();
  for (const library of index.libraries) {
    for (const assetId of library.assets) {
      const current = libraryIdsByAsset.get(assetId) ?? [];
      current.push(library.id);
      libraryIdsByAsset.set(assetId, current);
    }
  }

  const sourceFiles = ['registry/index.json'];
  const manifestIssues: ManifestIssue[] = [];
  const assets: RegistryAssetView[] = [];

  for (const asset of index.assets) {
    const { view: manifest, issue } = await loadManifest(root, repoRoot, asset.id, asset.version);
    if (manifest) {
      sourceFiles.push(manifest.sourcePath);
    }
    if (issue) {
      manifestIssues.push(issue);
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
      sourcePath: 'registry/index.json',
    });
  }

  const libraries: readonly RegistryLibraryView[] = index.libraries.map((library) => ({
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
