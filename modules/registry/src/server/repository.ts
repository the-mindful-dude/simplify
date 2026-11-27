import { existsSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import {
  RegistryArtifactResolver,
  RegistryClient,
  RegistryClientError,
  validateAssetManifest,
  validateRegistryIndex,
} from '@simplify-dev/registry';
import type { AssetManifest, RegistryIndex } from '@simplify-dev/registry';

import { RegistryDataError } from '../errors.js';
import type { RegistryRepository } from '../port.js';
import { buildRegistrySnapshot, toManifestView } from '../view/mappers.js';
import type { ManifestLoadResult } from '../view/mappers.js';
import type { RegistrySnapshot } from '../view/types.js';

const REGISTRY_DIRECTORY = 'registry';

/** Retain only stable diagnostic context from delegated registry failures. */
function safeCause(error: unknown): Readonly<{ name: string; code?: string }> | undefined {
  if (error instanceof RegistryClientError) {
    return { name: error.name, code: error.code };
  }
  if (error instanceof Error) {
    return { name: error.name };
  }
  return undefined;
}

/**
 * Locate the repository registry source from the current working directory.
 * Path construction and containment checks are delegated to the registry
 * resolver; this function only decides which directory to hand to it.
 */
function findRegistryRoot(): { root: string; repoRoot: string } {
  let current = process.cwd();
  for (;;) {
    const root = resolve(current, REGISTRY_DIRECTORY);
    const index = new RegistryArtifactResolver({ registryRoot: root }).indexPath();
    if (existsSync(index)) {
      return { root, repoRoot: current };
    }
    const parent = resolve(current, '..');
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

/** Display-only conversion to the POSIX paths used in the browser view. */
function displayPath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

async function readIndex(client: RegistryClient): Promise<RegistryIndex> {
  let raw: unknown;
  try {
    raw = await client.getRegistryIndex();
  } catch (error) {
    throw new RegistryDataError('index_read_failed', 'Failed to read the registry index.', {
      cause: safeCause(error),
    });
  }

  const validation = validateRegistryIndex(raw);
  if (!validation.valid || !validation.value) {
    const firstIssue = validation.issues[0];
    throw new RegistryDataError(
      'index_invalid',
      `registry/index.json failed schema validation (${firstIssue ? `${firstIssue.path} ${firstIssue.message}` : 'unknown issue'}).`,
    );
  }
  return validation.value;
}

/**
 * Read and validate one artifact through the registry client. An unusable
 * manifest becomes a non-sensitive issue so the real index still renders.
 */
async function loadManifest(
  client: RegistryClient,
  artifacts: RegistryArtifactResolver,
  repoRoot: string,
  assetId: string,
  version: string,
): Promise<ManifestLoadResult> {
  let sourcePath: string;
  try {
    sourcePath = displayPath(repoRoot, artifacts.assetManifestPath(assetId, version));
  } catch {
    return {
      assetId,
      view: null,
      issue: { kind: 'invalid', assetId, detail: 'invalid asset id or version format' },
    };
  }

  let manifest: AssetManifest | null;
  try {
    manifest = await client.getAsset(assetId, version);
  } catch (error) {
    const invalidJson =
      error instanceof RegistryClientError && error.code === 'REGISTRY_INVALID_JSON';
    return {
      assetId,
      view: null,
      issue: {
        kind: 'invalid',
        assetId,
        detail: invalidJson
          ? `${sourcePath}: manifest JSON could not be parsed`
          : `${sourcePath}: manifest could not be read`,
      },
    };
  }

  if (manifest === null) {
    return {
      assetId,
      view: null,
      issue: {
        kind: 'absent',
        assetId,
        detail: `no versioned manifest at ${assetId}/@${version}/asset.json`,
      },
    };
  }

  const validation = validateAssetManifest(manifest);
  if (!validation.valid || !validation.value) {
    const firstIssue = validation.issues[0];
    return {
      assetId,
      view: null,
      issue: {
        kind: 'invalid',
        assetId,
        detail: `${sourcePath}: invalid manifest (${firstIssue ? `${firstIssue.path} ${firstIssue.message}` : 'schema validation failed'})`,
      },
    };
  }

  return { assetId, view: toManifestView(validation.value, sourcePath), issue: null };
}

/**
 * The real on-disk registry repository. It is the only web data path that
 * performs filesystem access, and it relies on `@simplify-dev/registry` for
 * artifact paths, reads, schema validation and traversal checks.
 */
export class OnDiskRegistryRepository implements RegistryRepository {
  async getSnapshot(): Promise<RegistrySnapshot> {
    const { root, repoRoot } = findRegistryRoot();
    const client = new RegistryClient({ registryRoot: root });
    const artifacts = new RegistryArtifactResolver({ registryRoot: root });
    const index = await readIndex(client);

    const manifests: ManifestLoadResult[] = [];
    for (const asset of index.assets) {
      manifests.push(await loadManifest(client, artifacts, repoRoot, asset.id, asset.version));
    }

    return buildRegistrySnapshot(index, manifests);
  }
}

/** Compatibility entry point for the existing web page composition root. */
export async function getRegistrySnapshot(): Promise<RegistrySnapshot> {
  return new OnDiskRegistryRepository().getSnapshot();
}
