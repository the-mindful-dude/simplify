import { isAbsolute, relative, resolve, sep } from 'node:path';

import { assetIdPattern, semanticVersionPattern } from '@simplify-dev/schemas';

/** The only artifact layout defined by the checked-in registry source. */
export const SOURCE_V1_LAYOUT = 'source-v1';

export type RegistryArtifactLayout = typeof SOURCE_V1_LAYOUT;

export type RegistryArtifactResolverErrorCode =
  | 'INVALID_REGISTRY_ROOT'
  | 'UNSUPPORTED_ARTIFACT_LAYOUT'
  | 'INVALID_ASSET_ID'
  | 'INVALID_VERSION'
  | 'INVALID_LIBRARY_ID'
  | 'INVALID_SOURCE_PATH'
  | 'PATH_ESCAPES_ROOT';

export class RegistryArtifactResolverError extends Error {
  public readonly code: RegistryArtifactResolverErrorCode;
  public readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: RegistryArtifactResolverErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'RegistryArtifactResolverError';
    this.code = code;
    this.details = details;
  }
}

export interface RegistryArtifactResolverOptions {
  /** Root of the checked-in registry source. */
  readonly registryRoot: string;
  /**
   * Layout discriminator. Only `source-v1` is defined: published on-disk
   * layouts are intentionally unsupported until a contract exists for them.
   */
  readonly layout?: string;
}

const ASSET_ID_PATTERN = new RegExp(assetIdPattern);
const VERSION_PATTERN = new RegExp(semanticVersionPattern);
const LIBRARY_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function assertAssetId(assetId: string): void {
  if (!ASSET_ID_PATTERN.test(assetId)) {
    throw new RegistryArtifactResolverError(
      'INVALID_ASSET_ID',
      `Invalid asset ID "${assetId}". Expected "<category>/<name>".`,
      { field: 'assetId', value: assetId },
    );
  }
}

function assertVersion(version: string): void {
  if (!VERSION_PATTERN.test(version)) {
    throw new RegistryArtifactResolverError(
      'INVALID_VERSION',
      `Invalid registry version "${version}". Expected a semantic version.`,
      { field: 'version', value: version },
    );
  }
}

function assertLibraryId(libraryId: string): void {
  if (!LIBRARY_ID_PATTERN.test(libraryId)) {
    throw new RegistryArtifactResolverError(
      'INVALID_LIBRARY_ID',
      `Invalid library ID "${libraryId}". Expected a lowercase slug.`,
      { field: 'libraryId', value: libraryId },
    );
  }
}

function assertSourcePath(sourcePath: string): void {
  const segments = sourcePath.split('/');
  if (
    sourcePath.length === 0 ||
    sourcePath.includes('\0') ||
    sourcePath.includes('\\') ||
    sourcePath.startsWith('/') ||
    /^[A-Za-z]:/.test(sourcePath) ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new RegistryArtifactResolverError(
      'INVALID_SOURCE_PATH',
      `Unsafe source path "${sourcePath}". Paths must be relative, use "/" separators, and stay within the asset version directory.`,
      { field: 'sourcePath', value: sourcePath },
    );
  }
}

/**
 * Pure path resolver for registry source-v1 artifacts. It owns path
 * construction and input validation; callers remain responsible for reads.
 */
export class RegistryArtifactResolver {
  private readonly registryRoot: string;

  constructor(options: RegistryArtifactResolverOptions) {
    if (typeof options.registryRoot !== 'string' || options.registryRoot.trim() === '') {
      throw new RegistryArtifactResolverError(
        'INVALID_REGISTRY_ROOT',
        'A non-empty registryRoot is required.',
        { field: 'registryRoot' },
      );
    }

    const layout = options.layout ?? SOURCE_V1_LAYOUT;
    if (layout !== SOURCE_V1_LAYOUT) {
      throw new RegistryArtifactResolverError(
        'UNSUPPORTED_ARTIFACT_LAYOUT',
        `Unsupported registry artifact layout "${layout}". Only "${SOURCE_V1_LAYOUT}" is defined; the published on-disk layout is not specified.`,
        { field: 'layout', value: layout, supportedLayout: SOURCE_V1_LAYOUT },
      );
    }

    this.registryRoot = resolve(options.registryRoot);
  }

  /** Validate an asset ID before any lookup that does not construct a path. */
  validateAssetId(assetId: string): void {
    assertAssetId(assetId);
  }

  indexPath(): string {
    return this.containedPath('index.json');
  }

  assetManifestPath(assetId: string, version: string): string {
    assertAssetId(assetId);
    assertVersion(version);
    return this.containedPath(assetId, `@${version}`, 'asset.json');
  }

  assetFilePath(assetId: string, version: string, sourcePath: string): string {
    assertAssetId(assetId);
    assertVersion(version);
    assertSourcePath(sourcePath);
    return this.containedPath(assetId, `@${version}`, sourcePath);
  }

  libraryManifestPath(libraryId: string, version: string): string {
    assertLibraryId(libraryId);
    assertVersion(version);
    return this.containedPath('libraries', libraryId, `@${version}`, 'manifest.json');
  }

  /** Normalize and verify containment after path construction, never before. */
  private containedPath(...segments: string[]): string {
    const target = resolve(this.registryRoot, ...segments);
    const relativeTarget = relative(this.registryRoot, target);
    if (
      relativeTarget === '' ||
      relativeTarget === '..' ||
      relativeTarget.startsWith(`..${sep}`) ||
      isAbsolute(relativeTarget)
    ) {
      throw new RegistryArtifactResolverError(
        'PATH_ESCAPES_ROOT',
        'Resolved registry path escapes the registry root.',
        { segments },
      );
    }
    return target;
  }
}
