import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep as pathSep } from 'node:path';

import type { AssetManifest, LibraryManifest } from '@simplify-dev/registry';
import { validateAssetManifest, validateLibraryManifest } from '@simplify-dev/registry';

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

/**
 * Locally observable provenance for a build. This is an unverified candidate:
 * the publishing service alone verifies source identity and mints an immutable
 * `PublicationRecord` (ADR-006). No `immutable` or `verified` claim belongs here.
 */
export interface ProvenanceCandidate {
  readonly source: {
    readonly repositoryId: string;
    readonly owner: string;
    readonly name: string;
    readonly url: string;
    readonly commitSha: string;
  };
  /** Attributed claim from local inputs; correlation only, never authentication. */
  readonly publisher: string;
  readonly generatedAt: string;
  readonly artifact: {
    readonly url: string;
    readonly integrity: string;
  };
}

export interface BuildMetadata {
  readonly schemaVersion: number;
  readonly libraryId: string;
  readonly version: string;
  readonly generatedAt: string;
  readonly sourceCommitSha: string | null;
  readonly assets: readonly AssetBuildEntry[];
  readonly files: readonly BuiltArtifact[];
  readonly provenance: ProvenanceCandidate;
}

export interface BuildResult {
  readonly artifacts: readonly BuiltArtifact[];
  readonly metadata: BuildMetadata;
  readonly provenance: ProvenanceCandidate;
  readonly deterministic: boolean;
}

const SCHEMA_VERSION = 1;
const DEFAULT_EXCLUDES = ['**/.env*', '**/.git/**', '**/node_modules/**', '**/dist/**'];
const LIBRARY_MANIFEST_NAMES = ['simplify/library.json', 'library.json'];
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ZERO_SHA_PATTERN = /^0{40}$/;
const GITHUB_HOST = 'github.com';
const OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export type PublicationProvenanceErrorCode = 'publication_provenance_unavailable';

/**
 * Raised when locally observable provenance is missing or malformed. Placeholder
 * or unverifiable values are never emitted as if they were valid provenance.
 */
export class PublicationProvenanceError extends Error {
  readonly code: PublicationProvenanceErrorCode = 'publication_provenance_unavailable';
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `Cannot establish local publication provenance: invalid or missing ${missing.join('; ')}. ` +
        'Declare a valid GitHub repository URL in the library manifest, provide a non-zero ' +
        '40-hex commit SHA (GITHUB_SHA or .git metadata), and attribute a publisher ' +
        '(GITHUB_ACTOR, a maintainer, or the repository owner).',
    );
    this.name = 'PublicationProvenanceError';
    this.missing = missing;
  }
}

interface RepositoryIdentity {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly url: string;
}

function nonEmpty(value: string | undefined): string | null {
  return value !== undefined && value.trim().length > 0 ? value.trim() : null;
}

function rejectRepositoryIdentity(reason: string): never {
  throw new PublicationProvenanceError([`source.repository identity (${reason})`]);
}

function parseRepositoryIdentity(repository: string | undefined): RepositoryIdentity | null {
  const value = nonEmpty(repository);
  if (value === null) {
    return null;
  }

  let path: string;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return rejectRepositoryIdentity('malformed repository URL');
    }
    if (parsed.protocol !== 'https:') {
      return rejectRepositoryIdentity('repository URL must use https');
    }
    if (parsed.hostname.toLowerCase() !== GITHUB_HOST) {
      return rejectRepositoryIdentity('repository host must be github.com');
    }
    if (
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.port !== '' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) {
      return rejectRepositoryIdentity(
        'repository URL must not contain credentials, a port, a query or a fragment',
      );
    }
    path = parsed.pathname;
  } else {
    const scp = /^(?:([^@/\s]+)@)?([^:/\s]+):(.+)$/.exec(value);
    if (scp !== null) {
      if (scp[2]!.toLowerCase() !== GITHUB_HOST) {
        return rejectRepositoryIdentity('repository host must be github.com');
      }
      path = scp[3]!;
    } else {
      path = value;
    }
  }

  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments.length !== 2) {
    return rejectRepositoryIdentity('expected exactly <owner>/<name>');
  }
  const owner = segments[0]!;
  const rawName = segments[1]!;
  const name = rawName.endsWith('.git') ? rawName.slice(0, -4) : rawName;
  if (!OWNER_PATTERN.test(owner) || name === '.' || name === '..' || !NAME_PATTERN.test(name)) {
    return rejectRepositoryIdentity('invalid owner or repository name');
  }

  const url = `https://${GITHUB_HOST}/${owner}/${name}`;
  return { repositoryId: url, owner, name, url };
}

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

function validateCommitSha(value: string, source: string): string {
  if (!COMMIT_SHA_PATTERN.test(value) || ZERO_SHA_PATTERN.test(value)) {
    throw new PublicationProvenanceError([
      `source.commitSha (${source} must be a non-zero 40-hex commit SHA)`,
    ]);
  }
  return value.toLowerCase();
}

async function resolveCommitSha(libraryRoot: string): Promise<string | null> {
  const envSha = nonEmpty(process.env.GITHUB_SHA);
  if (envSha !== null) {
    return validateCommitSha(envSha, 'GITHUB_SHA');
  }

  const headPath = join(libraryRoot, '.git', 'HEAD');
  let head: string;
  try {
    head = (await readFile(headPath, 'utf8')).trim();
  } catch {
    return null;
  }
  if (head.length === 0) {
    return null;
  }

  if (head.startsWith('ref: ')) {
    const ref = head.slice(5).trim();
    const refPath = join(libraryRoot, '.git', ...ref.split('/'));
    let refValue: string;
    try {
      refValue = (await readFile(refPath, 'utf8')).trim();
    } catch {
      return null;
    }
    return refValue.length > 0 ? validateCommitSha(refValue, '.git HEAD ref') : null;
  }

  return validateCommitSha(head, '.git HEAD');
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
  const repositoryIdentity = parseRepositoryIdentity(libraryManifest.repository);
  const publisher =
    nonEmpty(process.env.GITHUB_ACTOR) ??
    nonEmpty(
      libraryManifest.maintainers?.find((maintainer) => nonEmpty(maintainer.name) !== null)?.name,
    ) ??
    repositoryIdentity?.owner ??
    null;

  if (repositoryIdentity === null || commitSha === null || publisher === null) {
    const missing: string[] = [];
    if (repositoryIdentity === null) {
      missing.push('source.repository identity (declare "repository" in the library manifest)');
    }
    if (commitSha === null) {
      missing.push('source.commitSha (set GITHUB_SHA or provide .git metadata)');
    }
    if (publisher === null) {
      missing.push('publisher (set GITHUB_ACTOR or declare a maintainer)');
    }
    throw new PublicationProvenanceError(missing);
  }

  // Correlation only (never authentication): in Actions, runner-provided
  // repository evidence must agree with the validated manifest repository.
  const actionsRepository = nonEmpty(process.env.GITHUB_REPOSITORY);
  if (
    process.env.GITHUB_ACTIONS === 'true' &&
    actionsRepository !== null &&
    actionsRepository.toLowerCase() !==
      `${repositoryIdentity.owner}/${repositoryIdentity.name}`.toLowerCase()
  ) {
    throw new PublicationProvenanceError([
      `publisher attribution (GITHUB_REPOSITORY "${actionsRepository}" does not match the manifest repository)`,
    ]);
  }

  const deterministic = true;
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

  const provenance: ProvenanceCandidate = {
    source: {
      repositoryId: repositoryIdentity.repositoryId,
      owner: repositoryIdentity.owner,
      name: repositoryIdentity.name,
      url: repositoryIdentity.url,
      commitSha,
    },
    publisher,
    generatedAt,
    artifact: {
      url: `https://registry.simplify.dev/libraries/${libraryManifest.id}/@${buildVersion}`,
      integrity: combinedIntegrity,
    },
  };

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
    sourceCommitSha: commitSha,
    assets,
    files: artifacts,
    provenance,
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
    provenance,
    deterministic,
  };
}
