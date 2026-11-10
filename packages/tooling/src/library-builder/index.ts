import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep as pathSep } from 'node:path';

import type { AssetManifest, LibraryManifest, PublicationRecord } from '@simplify-dev/registry';
import {
  validateAssetManifest,
  validateLibraryManifest,
  validatePublicationRecord,
} from '@simplify-dev/registry';

export interface BuildOptions {
  readonly libraryRoot?: string;
  readonly outputDir?: string;
  readonly dryRun?: boolean;
  readonly version?: string | undefined;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

export interface BuiltArtifact {
  readonly path: string;
  readonly target: string;
  readonly hash: string;
  readonly size: number;
}

export interface AssetBuildEntry {
  readonly manifestPath: string;
  readonly manifest: AssetManifest;
  readonly files: readonly BuiltArtifact[];
}

export interface BuildMetadata {
  readonly schemaVersion: number;
  readonly libraryId: string;
  readonly version: string;
  readonly generatedAt: string;
  readonly sourceCommitSha: string | null;
  readonly assets: readonly AssetBuildEntry[];
  readonly files: readonly BuiltArtifact[];
  readonly publicationRecord: PublicationRecord;
}

export interface BuildResult {
  readonly artifacts: readonly BuiltArtifact[];
  readonly metadata: BuildMetadata;
  readonly publicationRecord: PublicationRecord;
  readonly deterministic: boolean;
}

const SCHEMA_VERSION = 1;
const DEFAULT_EXCLUDES = ['**/.env*', '**/.git/**', '**/node_modules/**', '**/dist/**'];
const LIBRARY_MANIFEST_NAMES = ['simplify/library.json', 'library.json'];

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern: string): RegExp {
  let escaped = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i]!;
    if (c === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        escaped += '(?:.*/)?';
        i += 3;
      } else {
        escaped += '.*';
        i += 2;
      }
    } else if (c === '*') {
      escaped += '[^/]*';
      i += 1;
    } else if (c === '?') {
      escaped += '[^/]';
      i += 1;
    } else {
      escaped += escapeRegExp(c);
      i += 1;
    }
  }
  return new RegExp(`^${escaped}$`);
}

function normalizePath(value: string): string {
  return value.split(pathSep).join('/');
}

function matchesGlob(filePath: string, pattern: string): boolean {
  return globToRegex(pattern).test(filePath);
}

function isIncluded(filePath: string, includePatterns: readonly string[]): boolean {
  if (includePatterns.length === 0) {
    return true;
  }
  return includePatterns.some((pattern) => matchesGlob(filePath, pattern));
}

function isExcluded(filePath: string, excludePatterns: readonly string[]): boolean {
  return excludePatterns.some((pattern) => matchesGlob(filePath, pattern));
}

async function resolveCommitSha(libraryRoot: string): Promise<string | null> {
  const envSha = process.env.GITHUB_SHA;
  if (envSha !== undefined && envSha.length > 0) {
    return envSha;
  }

  const headPath = join(libraryRoot, '.git', 'HEAD');
  let head: string;
  try {
    head = (await readFile(headPath, 'utf8')).trim();
  } catch {
    return null;
  }

  if (head.startsWith('ref: ')) {
    const ref = head.slice(5).trim();
    const refPath = join(libraryRoot, '.git', ...ref.split('/'));
    try {
      const refValue = (await readFile(refPath, 'utf8')).trim();
      return refValue.length > 0 ? refValue : null;
    } catch {
      return null;
    }
  }

  if (/^[0-9a-fA-F]{40}$/.test(head)) {
    return head;
  }

  return null;
}

function hashBytes(bytes: Uint8Array): string {
  return `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
}

export async function buildLibrary(
  libraryRoot: string,
  options: BuildOptions = {} as BuildOptions,
): Promise<BuildResult> {
  const root = resolve(libraryRoot);
  const outputDir = resolve(root, options.outputDir ?? 'dist/simplify-build');
  const dryRun = options.dryRun === true;
  const version = options.version;

  let libraryManifestPath: string | null = null;
  let libraryManifest: LibraryManifest | null = null;
  for (const name of LIBRARY_MANIFEST_NAMES) {
    const candidate = join(root, name);
    try {
      const raw = await readFile(candidate, 'utf8');
      libraryManifest = JSON.parse(raw) as LibraryManifest;
      libraryManifestPath = candidate;
      break;
    } catch {
      // try the next candidate location
    }
  }

  if (!libraryManifest || !libraryManifestPath) {
    throw new Error(
      `No library manifest found in "${root}" (expected simplify/library.json or library.json).`,
    );
  }

  const libraryValidation = validateLibraryManifest(libraryManifest);
  if (!libraryValidation.valid || !libraryValidation.value) {
    throw new Error(
      `Invalid library manifest: ${libraryValidation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  libraryManifest = libraryValidation.value;

  const buildVersion = version ?? libraryManifest.version;
  const commitSha = await resolveCommitSha(root);
  const deterministic = commitSha !== null;
  const generatedAt = new Date().toISOString();

  const includePatterns =
    options.include !== undefined && options.include.length > 0
      ? [...options.include]
      : [...libraryManifest.publishing.include];
  const excludePatterns = [
    ...DEFAULT_EXCLUDES,
    ...(libraryManifest.publishing.exclude ?? []),
    ...(options.exclude ?? []),
  ];

  const assetEntries: Array<{
    readonly manifestPath: string;
    readonly manifest: AssetManifest;
    readonly sources: readonly string[];
  }> = [];
  const assetManifestPaths: string[] = [];
  const requiredSources = new Set<string>();

  for (const assetRef of libraryManifest.assets) {
    const assetPath = join(root, assetRef);
    let raw: string;
    try {
      raw = await readFile(assetPath, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read asset manifest "${assetRef}": ${(err as Error).message}`);
    }

    let manifest: AssetManifest;
    try {
      manifest = JSON.parse(raw) as AssetManifest;
    } catch (err) {
      throw new Error(`Failed to parse asset manifest "${assetRef}": ${(err as Error).message}`);
    }

    const assetValidation = validateAssetManifest(manifest);
    if (!assetValidation.valid || !assetValidation.value) {
      throw new Error(
        `Invalid asset manifest "${assetRef}": ${assetValidation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join('; ')}`,
      );
    }
    manifest = assetValidation.value;

    assetManifestPaths.push(normalizePath(relative(root, assetPath)));

    const sources: string[] = [];
    for (const mode of manifest.installation?.modes ?? []) {
      for (const mapping of mode.files ?? []) {
        const source = normalizePath(mapping.source);
        sources.push(source);
        requiredSources.add(source);
      }
    }

    assetEntries.push({ manifestPath: assetPath, manifest, sources });
  }

  const includedSources = [...requiredSources].filter(
    (file) => isIncluded(file, includePatterns) && !isExcluded(file, excludePatterns),
  );

  const essentialFiles = [
    normalizePath(relative(root, libraryManifestPath)),
    ...assetManifestPaths,
  ];

  const targets = new Set<string>();
  for (const source of includedSources) targets.add(source);
  for (const essential of essentialFiles) targets.add(essential);

  const sortedTargets = [...targets].sort();

  const fileBytes = new Map<string, Buffer>();
  for (const target of sortedTargets) {
    let bytes: Buffer;
    try {
      bytes = await readFile(join(root, target));
    } catch (err) {
      throw new Error(`Failed to read source file "${target}": ${(err as Error).message}`);
    }
    fileBytes.set(target, bytes);
  }

  const artifacts: BuiltArtifact[] = sortedTargets.map((target) => {
    const bytes = fileBytes.get(target);
    if (bytes === undefined) {
      throw new Error(`Missing bytes for built artifact "${target}".`);
    }
    return {
      path: join(outputDir, target),
      target,
      hash: hashBytes(bytes),
      size: bytes.length,
    };
  });

  const combinedIntegrity = `sha256-${createHash('sha256')
    .update(artifacts.map((a) => a.hash).join(''))
    .digest('base64')}`;

  const publicationRecord: PublicationRecord = {
    schemaVersion: SCHEMA_VERSION,
    libraryId: libraryManifest.id,
    version: buildVersion,
    source: {
      repositoryId:
        libraryManifest.repository ?? `https://github.com/unknown/${libraryManifest.id}`,
      owner: 'unknown',
      name: libraryManifest.id,
      url: libraryManifest.repository ?? `https://github.com/unknown/${libraryManifest.id}`,
      commitSha: commitSha ?? '0000000000000000000000000000000000000000',
    },
    publishedAt: generatedAt,
    artifact: {
      url: `https://registry.simplify.dev/libraries/${libraryManifest.id}/@${buildVersion}`,
      integrity: combinedIntegrity,
    },
    publisher: 'unknown',
    immutable: true,
  };

  const publicationValidation = validatePublicationRecord(publicationRecord);
  if (!publicationValidation.valid) {
    throw new Error(
      `Failed to build a valid publication record: ${publicationValidation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  const artifactsByTarget = new Map(artifacts.map((artifact) => [artifact.target, artifact]));
  const assets: AssetBuildEntry[] = assetEntries.map((entry) => {
    const files = entry.sources
      .filter((source) => artifactsByTarget.has(source))
      .map((source) => {
        const artifact = artifactsByTarget.get(source);
        if (artifact === undefined) {
          throw new Error(`Missing artifact for asset source "${source}".`);
        }
        return artifact;
      });
    return { manifestPath: entry.manifestPath, manifest: entry.manifest, files };
  });

  const metadata: BuildMetadata = {
    schemaVersion: SCHEMA_VERSION,
    libraryId: libraryManifest.id,
    version: buildVersion,
    generatedAt,
    sourceCommitSha: commitSha ?? null,
    assets,
    files: artifacts,
    publicationRecord,
  };

  const metadataJson = JSON.stringify(metadata);
  JSON.parse(metadataJson);

  if (!dryRun) {
    await mkdir(outputDir, { recursive: true });
    for (const artifact of artifacts) {
      await mkdir(join(outputDir, dirname(artifact.target)), { recursive: true });
      const bytes = fileBytes.get(artifact.target);
      if (bytes === undefined) {
        throw new Error(`Missing bytes for artifact "${artifact.target}".`);
      }
      await writeFile(artifact.path, bytes);
    }
    await writeFile(join(outputDir, 'build-metadata.json'), metadataJson);
  }

  return {
    artifacts,
    metadata,
    publicationRecord,
    deterministic,
  };
}
