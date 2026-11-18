import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Command } from './index.js';
import { CliError, info, success, warning } from '../cli.js';
import {
  createGitHubAppClient,
  loadGitHubAppConfig,
  GitHubConnectionService,
  InMemoryRepositoryLinkStore,
  type GitHubAppClient,
  type GitHubRepositorySummary,
} from '@simplify-dev/github';
import {
  validateLibraryManifest,
  validateAssetManifest,
  validateRepositoryAssociation,
  type LibraryManifest,
  type RepositoryAssociation,
} from '@simplify-dev/registry';

const LIBRARY_MANIFEST_PATH = 'simplify/library.json';
const ASSETS_DIR = 'simplify/assets';
const DEFAULT_LICENSE = 'MIT';
const DEFAULT_VERSION = '0.1.0';

interface LocalLibrary {
  readonly manifest: LibraryManifest | undefined;
  readonly assetManifests: readonly string[];
  readonly detectedAssetFiles: readonly string[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function libraryIdFromName(value: string): string {
  const id = slugify(value);
  if (id.length === 0 || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    return 'library';
  }
  return id;
}

function parseRepository(repository: string): { owner: string; name: string } {
  const match = repository.match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new CliError(
      `Invalid repository "${repository}". Expected format: owner/name.`,
      'INVALID_REPOSITORY',
    );
  }
  return { owner: match[1]!, name: match[2]! };
}

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

async function readLocalLibrary(targetDir: string): Promise<LocalLibrary> {
  const manifestPath = join(targetDir, LIBRARY_MANIFEST_PATH);
  let manifest: LibraryManifest | undefined;
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(raw) as LibraryManifest;
  } catch {
    // No library manifest present — guided setup path handles this.
  }

  const detectedAssetFiles: string[] = [];
  const assetManifests: string[] = [];

  if (manifest) {
    for (const assetPath of manifest.assets) {
      const fullPath = join(targetDir, assetPath);
      try {
        await fs.access(fullPath);
        assetManifests.push(assetPath);
        detectedAssetFiles.push(fullPath);
      } catch {
        // Referenced manifest is missing on disk.
      }
    }
  }

  try {
    const entries = await fs.readdir(join(targetDir, ASSETS_DIR), { recursive: true });
    for (const entry of entries) {
      if (entry.endsWith('.asset.json')) {
        const relative = join(ASSETS_DIR, entry);
        if (!assetManifests.includes(relative)) {
          detectedAssetFiles.push(join(targetDir, relative));
        }
      }
    }
  } catch {
    // No simplify/assets directory yet.
  }

  return { manifest, assetManifests, detectedAssetFiles };
}

function buildLibraryManifest(options: {
  readonly libraryId: string;
  readonly name: string;
  readonly description: string;
  readonly license: string;
}): LibraryManifest {
  return {
    schemaVersion: 1,
    id: options.libraryId,
    name: options.name,
    description: options.description,
    version: DEFAULT_VERSION,
    license: options.license,
    assets: ['simplify/assets/library/example.asset.json'],
    publishing: {
      include: ['src/**', 'simplify/**', 'README.md', 'CHANGELOG.md'],
      exclude: ['**/node_modules/**', '**/.env*', '**/.simplify/**'],
    },
  };
}

async function writeFileIfNotExists(
  filePath: string,
  content: string,
  json: boolean,
): Promise<void> {
  let exists = false;
  try {
    await fs.access(filePath);
    exists = true;
  } catch {
    // Not present — safe to write.
  }
  if (exists) {
    warning(`Skipping existing file: ${filePath}.`, json);
    return;
  }
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { flag: 'wx' });
  info(`Created ${filePath}.`, json);
}

async function ensureWritable(filePaths: readonly string[]): Promise<void> {
  const existing: string[] = [];
  for (const filePath of filePaths) {
    try {
      await fs.access(filePath);
      existing.push(filePath);
    } catch {
      // Not present — safe to write.
    }
  }
  if (existing.length > 0) {
    throw new CliError(
      `Refusing to overwrite existing files:\n  ${existing.join('\n  ')}`,
      'FILE_EXISTS',
    );
  }
}

async function generateScaffold(
  targetDir: string,
  options: {
    readonly libraryId: string;
    readonly name: string;
    readonly description: string;
    readonly license: string;
    readonly dryRun: boolean;
    readonly json: boolean;
  },
): Promise<LibraryManifest> {
  const manifest = buildLibraryManifest({
    libraryId: options.libraryId,
    name: options.name,
    description: options.description,
    license: options.license,
  });

  const manifestPath = join(targetDir, LIBRARY_MANIFEST_PATH);
  const assetManifestPath = join(targetDir, ASSETS_DIR, 'library', 'example.asset.json');
  const assetsReadmePath = join(targetDir, ASSETS_DIR, 'library', 'README.md');
  const readmePath = join(targetDir, 'README.md');

  const files: readonly { readonly path: string; readonly content: string }[] = [
    {
      path: manifestPath,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    {
      path: assetManifestPath,
      content: `${JSON.stringify(
        {
          schemaVersion: 1,
          id: 'library/example',
          category: 'library',
          name: 'Example Asset',
          description: 'Minimal asset authoring example.',
          version: DEFAULT_VERSION,
          publisher: 'local-author',
          status: 'community',
          license: options.license,
          targets: [{ language: 'typescript' }],
          implementations: [
            {
              id: 'example',
              target: { language: 'typescript' },
              mode: 'source',
              entry: 'src/example.ts',
            },
          ],
          installation: {
            modes: [
              {
                mode: 'source',
                files: [{ source: 'src/example.ts', target: 'src/example.ts' }],
              },
            ],
          },
          documentation: {
            readme: 'docs/getting-started.md',
            examples: ['examples/'],
            changelog: 'CHANGELOG.md',
          },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: assetsReadmePath,
      content: '# Assets — library\n\nThis directory contains asset manifests for the library.\n',
    },
    {
      path: readmePath,
      content: `# ${options.name}\n\n${options.description}\n\nA simplify.dev library connected to GitHub.\n`,
    },
  ];

  if (options.dryRun) {
    for (const file of files) {
      info(`[dry-run] Would create ${file.path}.`, options.json);
    }
    info('Dry-run complete. No changes were made.', options.json);
    return manifest;
  }

  await ensureWritable(files.map((file) => file.path));
  for (const file of files) {
    await writeFileIfNotExists(file.path, file.content, options.json);
  }

  info(`Library "${options.name}" scaffolded.`, options.json);
  return manifest;
}

async function findRepositoryOnGitHub(
  appClient: GitHubAppClient,
  installationId: number,
  owner: string,
  name: string,
): Promise<GitHubRepositorySummary> {
  try {
    return await appClient.getRepository(installationId, owner, name);
  } catch {
    // Fall back to listing accessible repositories and matching by owner/name.
    const repositories = await appClient.listInstallationRepositories(installationId);
    const match = repositories.find(
      (repository) => repository.owner === owner && repository.name === name,
    );
    if (!match) {
      throw new CliError(
        `Repository ${owner}/${name} is not accessible to this GitHub App installation.`,
        'REPOSITORY_NOT_ACCESSIBLE',
      );
    }
    return match;
  }
}

export const libraryConnectCommand: Command = {
  name: 'library-connect',
  description: 'Connect an existing GitHub repository to a simplify.dev library.',
  options: [
    {
      name: 'library-id',
      type: 'string',
      description:
        'Library id to associate with the repository (derived from manifest or repository name).',
    },
    {
      name: 'installation-id',
      type: 'string',
      description: 'GitHub App installation id (or set GITHUB_INSTALLATION_ID).',
    },
    {
      name: 'target-dir',
      type: 'string',
      description: 'Target directory (defaults to the current working directory).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, options: rawOptions, dryRun, json } = context;

    const repository = args[0];
    if (!repository) {
      throw new CliError(
        'Missing required argument: <repository>. Usage: simplify library connect <owner/name>',
        'MISSING_ARGUMENT',
      );
    }

    const { owner, name } = parseRepository(repository);
    const targetDir =
      typeof rawOptions['target-dir'] === 'string' && rawOptions['target-dir'].length > 0
        ? rawOptions['target-dir']
        : process.cwd();

    const providedLibraryId =
      typeof rawOptions['library-id'] === 'string' && rawOptions['library-id'].length > 0
        ? rawOptions['library-id']
        : undefined;

    const installationIdRaw =
      typeof rawOptions['installation-id'] === 'string'
        ? Number(rawOptions['installation-id'])
        : undefined;
    const installationIdFromOption =
      typeof installationIdRaw === 'number' &&
      Number.isSafeInteger(installationIdRaw) &&
      installationIdRaw > 0
        ? installationIdRaw
        : undefined;
    const installationIdFromEnv =
      typeof process.env.GITHUB_INSTALLATION_ID === 'string'
        ? Number(process.env.GITHUB_INSTALLATION_ID)
        : undefined;
    const installationId =
      installationIdFromOption ??
      (typeof installationIdFromEnv === 'number' &&
      Number.isSafeInteger(installationIdFromEnv) &&
      installationIdFromEnv > 0
        ? installationIdFromEnv
        : undefined);

    if (!installationId) {
      throw new CliError(
        'Missing required option: --installation-id (or set GITHUB_INSTALLATION_ID).',
        'MISSING_OPTION',
      );
    }

    info(
      dryRun
        ? `[dry-run] Would connect ${owner}/${name} to simplify.dev in ${targetDir}.`
        : `Connecting ${owner}/${name} to simplify.dev...`,
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

    const repositorySummary = await findRepositoryOnGitHub(appClient, installationId, owner, name);

    const local = await readLocalLibrary(targetDir);

    let libraryId = providedLibraryId;
    let manifest: LibraryManifest | undefined = local.manifest;

    if (manifest) {
      if (providedLibraryId && providedLibraryId !== manifest.id) {
        throw new CliError(
          `Provided library id "${providedLibraryId}" does not match the library manifest id "${manifest.id}".`,
          'LIBRARY_ID_MISMATCH',
        );
      }
      libraryId = manifest.id;
    } else {
      libraryId = libraryId ?? libraryIdFromName(name);
    }

    if (!manifest) {
      manifest = await generateScaffold(targetDir, {
        libraryId,
        name,
        description: `A ${name} library for simplify.dev.`,
        license: DEFAULT_LICENSE,
        dryRun,
        json,
      });
    }

    // Validate the library structure.
    const libraryValidation = validateLibraryManifest(manifest);
    if (!libraryValidation.valid) {
      const issues = libraryValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Library manifest is invalid:\n${issues}`, 'INVALID_MANIFEST');
    }

    for (const assetPath of local.assetManifests) {
      const assetValidation = validateAssetManifest(
        JSON.parse(await fs.readFile(join(targetDir, assetPath), 'utf8')),
      );
      if (!assetValidation.valid) {
        const issues = assetValidation.issues
          .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
          .join('\n');
        throw new CliError(
          `Asset manifest "${assetPath}" is invalid:\n${issues}`,
          'INVALID_MANIFEST',
        );
      }
    }

    if (dryRun) {
      info('[dry-run] Would associate repository with library.', json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    const store = new InMemoryRepositoryLinkStore();
    const connectionService = new GitHubConnectionService({
      appClient,
      repositoryStore: store,
    });

    let link;
    try {
      link = await connectionService.linkRepository({
        repository: repositorySummary,
        libraryId,
      });
    } catch (err) {
      if (err instanceof CliError) {
        throw err;
      }
      const githubErr = err as { readonly code?: string; readonly message: string };
      if (githubErr.code === 'repository_already_linked') {
        throw new CliError(
          `Repository ${owner}/${name} is already linked to a different library. ` +
            'Disconnect it first or connect to the existing library.',
          'REPOSITORY_ALREADY_LINKED',
        );
      }
      if (githubErr.code === 'library_already_linked') {
        throw new CliError(
          `Library ${libraryId} is already linked to a different repository. ` +
            'Disconnect it first or use a different library id.',
          'LIBRARY_ALREADY_LINKED',
        );
      }
      throw new CliError(`Failed to link repository: ${githubErr.message}`, 'LINK_FAILED');
    }

    // Record the association in the registry schema shape for status reporting.
    const association: RepositoryAssociation = {
      repositoryId: link.repositoryId,
      owner: link.owner,
      name: link.name,
      url: link.url,
      defaultBranch: link.defaultBranch,
      visibility: link.visibility,
      libraryId: link.libraryId,
      linkedAt: link.linkedAt,
      status: link.status,
    };
    const associationValidation = validateRepositoryAssociation(association);
    if (!associationValidation.valid) {
      throw new CliError('Generated repository association is invalid.', 'INVALID_ASSOCIATION');
    }

    success(`Connected ${owner}/${name} to library "${libraryId}".`, json);
    info(`Repository: ${link.url}`, json);
    info(`Default branch: ${link.defaultBranch}`, json);
    info(`Visibility: ${link.visibility}`, json);
    info(`Asset manifests detected: ${local.assetManifests.length}`, json);
    info('Repository remains the canonical source of the library implementation.', json);
  },
};
