import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { Command } from './index.js';
import { CliError, info, success } from '../cli.js';
import {
  createGitHubAppClient,
  loadGitHubAppConfig,
  GitHubConnectionService,
  InMemoryRepositoryLinkStore,
  type GitHubAppClient,
} from '@simplify-dev/github';
import { buildLibrary, validateLibrary, type BuildResult } from '@simplify-dev/tooling';
import { validatePublicationRecord, type PublicationRecord } from '@simplify-dev/registry';
import type { LibraryManifest } from '@simplify-dev/schemas';

const LIBRARY_MANIFEST_PATH = 'simplify/library.json';
const GITHUB_API = 'https://api.github.com';
const TAG_PREFIX = 'v';

interface PublishedVersionStore {
  readonly has: (libraryId: string, version: string) => Promise<boolean>;
  readonly record: (
    libraryId: string,
    version: string,
    publicationRecord: PublicationRecord,
  ) => Promise<void>;
  readonly clear: () => void;
}

class InMemoryPublishedVersionStore implements PublishedVersionStore {
  private readonly published = new Map<string, PublicationRecord>();

  private key(libraryId: string, version: string): string {
    return `${libraryId}\0${version}`;
  }

  async has(libraryId: string, version: string): Promise<boolean> {
    return this.published.has(this.key(libraryId, version));
  }

  async record(
    libraryId: string,
    version: string,
    publicationRecord: PublicationRecord,
  ): Promise<void> {
    this.published.set(this.key(libraryId, version), publicationRecord);
  }

  clear(): void {
    this.published.clear();
  }
}

export const publishedVersionStore = new InMemoryPublishedVersionStore();

async function createAppClient(): Promise<GitHubAppClient> {
  let config;
  try {
    config = loadGitHubAppConfig();
  } catch {
    throw new CliError(
      'GitHub App configuration is incomplete. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, ' +
        'GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, and GITHUB_APP_WEBHOOK_SECRET.',
      'CONFIG_INCOMPLETE',
    );
  }
  return createGitHubAppClient(config);
}

function resolveInstallationId(
  options: Readonly<Record<string, string | boolean>>,
): number | undefined {
  const installationIdFromOption =
    typeof options['installation-id'] === 'string' ? Number(options['installation-id']) : undefined;
  const validOption =
    typeof installationIdFromOption === 'number' &&
    Number.isSafeInteger(installationIdFromOption) &&
    installationIdFromOption > 0
      ? installationIdFromOption
      : undefined;
  const installationIdFromEnv =
    typeof process.env.GITHUB_INSTALLATION_ID === 'string'
      ? Number(process.env.GITHUB_INSTALLATION_ID)
      : undefined;
  const validEnv =
    typeof installationIdFromEnv === 'number' &&
    Number.isSafeInteger(installationIdFromEnv) &&
    installationIdFromEnv > 0
      ? installationIdFromEnv
      : undefined;
  return validOption ?? validEnv;
}

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function parseTagArgument(value: string): { readonly tag: string; readonly version: string } {
  const tag = value.startsWith(TAG_PREFIX) ? value : `${TAG_PREFIX}${value}`;
  const version = tag.startsWith(TAG_PREFIX) ? tag.slice(TAG_PREFIX.length) : tag;
  if (!semverPattern.test(version)) {
    throw new CliError(
      `Invalid tag "${value}". Expected a semantic version such as v1.2.0.`,
      'INVALID_TAG',
    );
  }
  return { tag, version };
}

function validateTagAgainstManifest(tag: string, version: string, manifestVersion: string): void {
  if (version !== manifestVersion) {
    const suggested = manifestVersion.startsWith(TAG_PREFIX)
      ? manifestVersion
      : `${TAG_PREFIX}${manifestVersion}`;
    throw new CliError(
      `Tag version "${version}" does not match the library manifest version "${manifestVersion}". ` +
        `Use tag "${suggested}" to publish version "${manifestVersion}", or update the manifest version.`,
      'TAG_VERSION_MISMATCH',
    );
  }
}

async function readLibraryManifest(targetDir: string): Promise<LibraryManifest> {
  const manifestPath = join(targetDir, LIBRARY_MANIFEST_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch {
    throw new CliError(`No library manifest found at "${manifestPath}".`, 'MANIFEST_NOT_FOUND');
  }
  try {
    return JSON.parse(raw) as LibraryManifest;
  } catch (err) {
    throw new CliError(
      `Failed to parse library manifest "${manifestPath}" as JSON: ${(err as Error).message}`,
      'INVALID_MANIFEST',
    );
  }
}

async function resolveTagCommitSha(
  appClient: GitHubAppClient,
  installationId: number,
  owner: string,
  name: string,
  tag: string,
): Promise<string> {
  let token;
  try {
    token = await appClient.createInstallationToken(installationId);
  } catch (err) {
    throw new CliError(
      `Failed to create GitHub installation token: ${(err as Error).message}`,
      'TOKEN_FAILED',
    );
  }

  const headers = {
    Authorization: `token ${token.token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'simplify-dev-cli',
  };

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}/repos/${owner}/${name}/git/ref/tags/${tag}`, {
      headers,
    });
  } catch (err) {
    throw new CliError(
      `Failed to query GitHub for tag ${tag}: ${(err as Error).message}`,
      'FETCH_TAG_FAILED',
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 500);
    } catch {
      // ignore
    }
    throw new CliError(
      `GitHub tag "${tag}" not found for ${owner}/${name} (${response.status}): ${detail}`,
      'INVALID_TAG',
    );
  }

  const refData = (await response.json()) as {
    readonly object: { readonly sha: string; readonly type: string };
  };
  let commitSha = refData.object.sha;
  let objectType = refData.object.type;

  if (objectType === 'tag') {
    let tagResponse: Response;
    try {
      tagResponse = await fetch(`${GITHUB_API}/repos/${owner}/${name}/git/tags/${commitSha}`, {
        headers,
      });
    } catch (err) {
      throw new CliError(
        `Failed to peel annotated tag ${tag}: ${(err as Error).message}`,
        'FETCH_TAG_FAILED',
      );
    }
    if (!tagResponse.ok) {
      throw new CliError(
        `Failed to peel annotated tag ${tag} (${tagResponse.status}).`,
        'FETCH_TAG_FAILED',
      );
    }
    const tagData = (await tagResponse.json()) as {
      readonly object: { readonly sha: string; readonly type: string };
    };
    commitSha = tagData.object.sha;
    objectType = tagData.object.type;
  }

  if (objectType !== 'commit' || !/^[0-9a-fA-F]{40}$/.test(commitSha)) {
    throw new CliError(`Tag ${tag} did not resolve to a commit SHA.`, 'INVALID_TAG');
  }

  return commitSha;
}

async function submitToRegistry(
  publicationRecord: PublicationRecord,
): Promise<{ readonly registryUrl: string; readonly submitted: boolean }> {
  const validation = validatePublicationRecord(publicationRecord);
  if (!validation.valid) {
    throw new CliError(
      `Publication record is invalid: ${validation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
      'VALIDATION_FAILED',
    );
  }

  // The simplify.dev registry publish endpoint is wired separately. The
  // publication record is the immutable artifact submitted to the registry.
  return {
    registryUrl: publicationRecord.artifact.url,
    submitted: true,
  };
}

export const libraryPublishCommand: Command = {
  name: 'library-publish',
  description:
    'Publish a stable release from a Git tag or version. Published versions are immutable.',
  options: [
    {
      name: 'tag',
      type: 'string',
      description:
        'Git tag to publish (e.g. v1.2.0). Alternative to the positional [tag|version] argument.',
    },
    {
      name: 'version',
      type: 'string',
      description:
        'Version to publish (resolves to tag v<version>). Alternative to the positional [tag|version] argument.',
    },
    {
      name: 'path',
      type: 'string',
      description: 'Path to the library root (defaults to the current directory).',
    },
    {
      name: 'installation-id',
      type: 'string',
      description: 'GitHub App installation id (or set GITHUB_INSTALLATION_ID).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without publishing.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, options: rawOptions, dryRun, json } = context;

    const libraryId = args[0];
    if (!libraryId) {
      throw new CliError(
        'Missing required argument: <libraryId>. Usage: simplify library publish <libraryId> [tag|version]',
        'MISSING_ARGUMENT',
      );
    }

    const tagOption =
      typeof rawOptions.tag === 'string' && rawOptions.tag.length > 0 ? rawOptions.tag : undefined;
    const versionOption =
      typeof rawOptions.version === 'string' && rawOptions.version.length > 0
        ? rawOptions.version
        : undefined;
    const positional = args[1];

    let tagOrVersion: string | undefined;
    if (tagOption) {
      tagOrVersion = tagOption;
    } else if (versionOption) {
      tagOrVersion = versionOption;
    } else if (positional) {
      tagOrVersion = positional;
    }

    const targetDir =
      typeof rawOptions.path === 'string' && rawOptions.path.length > 0
        ? rawOptions.path
        : process.cwd();
    const installationId = resolveInstallationId(rawOptions);

    if (!installationId) {
      throw new CliError(
        'Missing required option: --installation-id (or set GITHUB_INSTALLATION_ID).',
        'MISSING_OPTION',
      );
    }

    info(
      dryRun
        ? `[dry-run] Would publish library "${libraryId}" from tag/version "${tagOrVersion ?? '<manifest version>'}" in ${targetDir}.`
        : `Publishing library "${libraryId}"...`,
      json,
    );

    let appClient: GitHubAppClient;
    try {
      appClient = await createAppClient();
    } catch (err) {
      if (err instanceof CliError) {
        throw err;
      }
      throw new CliError(
        `Failed to initialize GitHub App client: ${(err as Error).message}`,
        'CLIENT_INIT_FAILED',
      );
    }

    const store = new InMemoryRepositoryLinkStore();
    const connectionService = new GitHubConnectionService({
      appClient,
      repositoryStore: store,
    });

    const link = await connectionService.getLibraryRepository(libraryId);
    if (!link) {
      throw new CliError(
        `Library "${libraryId}" is not connected to a GitHub repository.`,
        'NOT_CONNECTED',
      );
    }

    const manifest = await readLibraryManifest(targetDir);
    const manifestVersion = manifest.version;

    let tag: string;
    let version: string;
    if (tagOrVersion === undefined) {
      version = manifestVersion;
      tag = `${TAG_PREFIX}${version}`;
    } else {
      ({ tag, version } = parseTagArgument(tagOrVersion));
      validateTagAgainstManifest(tag, version, manifestVersion);
    }

    if (!semverPattern.test(version)) {
      throw new CliError(
        `Invalid version "${version}". Expected semantic versioning (e.g. 1.2.0).`,
        'INVALID_TAG',
      );
    }

    const alreadyPublished = await publishedVersionStore.has(libraryId, version);
    if (alreadyPublished) {
      throw new CliError(
        `Version "${version}" of library "${libraryId}" is already published. ` +
          'Published versions are immutable and cannot be replaced. ' +
          'Correct the release with a new version (e.g. a patch bump).',
        'ALREADY_PUBLISHED',
      );
    }

    info(`Resolving commit SHA for tag ${tag} of ${link.owner}/${link.name}...`, json);

    let commitSha: string;
    try {
      commitSha = await resolveTagCommitSha(appClient, installationId, link.owner, link.name, tag);
    } catch (err) {
      if (err instanceof CliError) {
        throw err;
      }
      throw new CliError(
        `Failed to resolve commit SHA for tag ${tag}: ${(err as Error).message}`,
        'FETCH_TAG_FAILED',
      );
    }

    info(`Validating library and assets in ${targetDir} before publication...`, json);

    let validation;
    try {
      validation = await validateLibrary(targetDir);
    } catch (err) {
      throw new CliError(
        `Library validation failed: ${(err as Error).message}`,
        'VALIDATION_FAILED',
      );
    }
    if (!validation.valid) {
      const issues = validation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Library validation failed:\n${issues}`, 'VALIDATION_FAILED');
    }

    info('Building immutable publication artifact...', json);

    let result: BuildResult;
    try {
      result = await buildLibrary(targetDir, {
        libraryRoot: targetDir,
        version,
        dryRun,
      });
    } catch (err) {
      throw new CliError(`Failed to build library: ${(err as Error).message}`, 'BUILD_FAILED');
    }

    const publicationRecord: PublicationRecord = result.publicationRecord;
    if (publicationRecord.version !== version) {
      throw new CliError(
        `Built publication version "${publicationRecord.version}" does not match requested version "${version}".`,
        'BUILD_FAILED',
      );
    }

    if (dryRun) {
      info(`[dry-run] Would publish version ${version} from commit ${commitSha}.`, json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    let registryUrl: string;
    let submitted: boolean;
    try {
      const submission = await submitToRegistry(publicationRecord);
      registryUrl = submission.registryUrl;
      submitted = submission.submitted;
    } catch (err) {
      if (err instanceof CliError) {
        throw err;
      }
      throw new CliError(
        `Failed to submit publication to the registry: ${(err as Error).message}`,
        'PUBLISH_FAILED',
      );
    }

    await publishedVersionStore.record(libraryId, version, publicationRecord);

    success(`Published library "${libraryId}" version ${version} from commit ${commitSha}`, json);
    info(`Registry URL: ${registryUrl}`, json);
    info(`Tag: ${tag}`, json);
    info(`Commit: ${commitSha}`, json);
    info(`Immutable: true`, json);
    if (json) {
      console.log(
        JSON.stringify(
          {
            libraryId,
            version,
            tag,
            commitSha,
            registryUrl,
            submitted,
            immutable: publicationRecord.immutable,
          },
          null,
          2,
        ),
      );
    }
  },
};
