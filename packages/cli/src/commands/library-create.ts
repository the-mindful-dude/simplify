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
  type LibraryManifest,
} from '@simplify-dev/registry';

const LIBRARY_MANIFEST_PATH = 'simplify/library.json';
const ASSETS_DIR = 'simplify/assets';
const DEFAULT_LICENSE = 'MIT';
const DEFAULT_VERSION = '0.1.0';
const GITHUB_API = 'https://api.github.com';

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

function validateRepositoryName(name: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new CliError(
      `Invalid repository name "${name}". Use lowercase letters, numbers, hyphens, and underscores.`,
      'INVALID_REPOSITORY_NAME',
    );
  }
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

function buildExampleAssetManifest(license: string): unknown {
  return {
    schemaVersion: 1,
    id: 'library/example',
    category: 'library',
    name: 'Example Asset',
    description: 'Minimal asset authoring example.',
    version: DEFAULT_VERSION,
    publisher: 'local-author',
    status: 'community',
    license,
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
  };
}

function readmeContent(options: { readonly name: string; readonly description: string }): string {
  return `# ${options.name}\n\n${options.description}\n\nA simplify.dev library created on GitHub.\n`;
}

function changelogContent(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# Changelog\n\nAll notable changes to this library will be documented in this file.\n\n## [0.1.0] - ${today}\n\n### Added\n\n- Initial library structure created by \`simplify library create\`.\n`;
}

function packageJsonContent(options: {
  readonly name: string;
  readonly description: string;
  readonly license: string;
}): string {
  return JSON.stringify(
    {
      name: options.name,
      version: DEFAULT_VERSION,
      description: options.description,
      license: options.license,
      type: 'module',
      main: './dist/index.js',
      files: ['dist/', 'simplify/', 'src/', 'README.md', 'CHANGELOG.md'],
      scripts: {
        build: 'tsc -p tsconfig.json',
        lint: 'eslint src',
        test: 'vitest run',
      },
      repository: {
        type: 'git',
        url: '',
      },
      keywords: ['simplify-dev', 'library'],
      publishConfig: {
        access: 'public',
      },
    },
    null,
    2,
  );
}

function githubWorkflowContent(): string {
  return `# name: simplify.dev library validation and publishing

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @simplify-dev/cli exec simplify asset validate
      - run: pnpm --filter @simplify-dev/cli exec simplify library build

  publish:
    needs: validate
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @simplify-dev/cli exec simplify library publish
    env:
      SIMPLIFY_PUBLISH_TOKEN: \${{ secrets.SIMPLIFY_PUBLISH_TOKEN }}
`;
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
  const srcIndexPath = join(targetDir, 'src', 'index.ts');
  const readmePath = join(targetDir, 'README.md');
  const changelogPath = join(targetDir, 'CHANGELOG.md');
  const packageJsonPath = join(targetDir, 'package.json');
  const workflowPath = join(targetDir, '.github', 'workflows', 'simplify.yml');

  const files: readonly { readonly path: string; readonly content: string }[] = [
    { path: manifestPath, content: `${JSON.stringify(manifest, null, 2)}\n` },
    {
      path: assetManifestPath,
      content: `${JSON.stringify(buildExampleAssetManifest(options.license), null, 2)}\n`,
    },
    {
      path: assetsReadmePath,
      content: '# Assets — library\n\nAsset manifests for this library.\n',
    },
    { path: srcIndexPath, content: 'export {};\n' },
    {
      path: readmePath,
      content: readmeContent({ name: options.name, description: options.description }),
    },
    { path: changelogPath, content: changelogContent() },
    {
      path: packageJsonPath,
      content: packageJsonContent({
        name: options.name,
        description: options.description,
        license: options.license,
      }),
    },
    { path: workflowPath, content: githubWorkflowContent() },
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

async function createGitHubRepository(
  appClient: GitHubAppClient,
  installationId: number,
  options: {
    readonly owner: string;
    readonly name: string;
    readonly description?: string;
    readonly visibility: 'public' | 'private';
    readonly dryRun: boolean;
    readonly json: boolean;
  },
): Promise<GitHubRepositorySummary> {
  const existing = await appClient.getRepository(installationId, options.owner, options.name).then(
    (summary) => summary,
    () => undefined as GitHubRepositorySummary | undefined,
  );

  if (existing) {
    info(`Repository ${options.owner}/${options.name} already exists; reusing it.`, options.json);
    return existing;
  }

  if (options.dryRun) {
    info(
      `[dry-run] Would create GitHub repository ${options.owner}/${options.name} (${options.visibility}).`,
      options.json,
    );
    throw new CliError('Dry-run cannot create a remote repository.', 'DRY_RUN_REMOTE');
  }

  let token;
  try {
    token = await appClient.createInstallationToken(installationId);
  } catch (err) {
    throw new CliError(
      `Failed to create GitHub installation token: ${(err as Error).message}`,
      'TOKEN_FAILED',
    );
  }

  const endpoint = `${GITHUB_API}/orgs/${options.owner}/repos`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `token ${token.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'simplify-dev-cli',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description ?? '',
        private: options.visibility === 'private',
        auto_init: false,
      }),
    });
  } catch (err) {
    throw new CliError(
      `Failed to create GitHub repository: ${(err as Error).message}`,
      'REPOSITORY_CREATE_FAILED',
    );
  }

  if (!response.ok) {
    // An organization may not exist or the installation may not belong to it;
    // fall back to creating under the authenticated user account.
    const userEndpoint = `${GITHUB_API}/user/repos`;
    let userResponse: Response;
    try {
      userResponse = await fetch(userEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `token ${token.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'simplify-dev-cli',
        },
        body: JSON.stringify({
          name: options.name,
          description: options.description ?? '',
          private: options.visibility === 'private',
          auto_init: false,
        }),
      });
    } catch (err) {
      throw new CliError(
        `Failed to create GitHub repository: ${(err as Error).message}`,
        'REPOSITORY_CREATE_FAILED',
      );
    }
    response = userResponse;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.text();
      detail = body.slice(0, 500);
    } catch {
      // ignore
    }
    throw new CliError(
      `GitHub rejected repository creation (${response.status}): ${detail}`,
      'REPOSITORY_CREATE_FAILED',
    );
  }

  const created = (await response.json()) as {
    readonly id: number;
    readonly owner: { readonly login: string };
    readonly name: string;
    readonly full_name: string;
    readonly html_url: string;
    readonly default_branch: string;
    readonly private: boolean;
  };

  return {
    repositoryId: String(created.id),
    owner: created.owner.login,
    name: created.name,
    fullName: created.full_name,
    url: created.html_url,
    defaultBranch: created.default_branch,
    visibility: created.private ? 'private' : 'public',
  };
}

export const libraryCreateCommand: Command = {
  name: 'library-create',
  description: 'Create a new GitHub repository and connect it to a simplify.dev library.',
  options: [
    {
      name: 'owner',
      type: 'string',
      description: 'GitHub account or organization that will own the repository.',
    },
    {
      name: 'name',
      type: 'string',
      description: 'Repository name.',
    },
    {
      name: 'description',
      type: 'string',
      description: 'Repository description.',
    },
    {
      name: 'visibility',
      type: 'string',
      description: 'Repository visibility: public or private (defaults to public).',
    },
    {
      name: 'library-id',
      type: 'string',
      description:
        'Library id to associate with the repository (derived from the repository name).',
    },
    {
      name: 'installation-id',
      type: 'string',
      description: 'GitHub App installation id (or set GITHUB_INSTALLATION_ID).',
    },
    {
      name: 'target-dir',
      type: 'string',
      description:
        'Directory to scaffold the library in (defaults to the current working directory).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making remote changes.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, json } = context;

    if (args.length > 0) {
      throw new CliError(
        `library-create does not accept arguments: ${args.join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const owner =
      typeof options.owner === 'string' && options.owner.length > 0 ? options.owner : undefined;
    const name =
      typeof options.name === 'string' && options.name.length > 0 ? options.name : undefined;
    if (!owner || !name) {
      throw new CliError(
        'Missing required options: --owner and --name. Usage: simplify library create --owner <owner> --name <name>',
        'MISSING_OPTION',
      );
    }
    validateRepositoryName(name);

    const visibility =
      typeof options.visibility === 'string' &&
      (options.visibility === 'public' || options.visibility === 'private')
        ? options.visibility
        : 'public';

    const installationIdRaw =
      typeof options['installation-id'] === 'string'
        ? Number(options['installation-id'])
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

    const targetDir =
      typeof options['target-dir'] === 'string' && options['target-dir'].length > 0
        ? options['target-dir']
        : process.cwd();
    const libraryId =
      typeof options['library-id'] === 'string' && options['library-id'].length > 0
        ? options['library-id']
        : libraryIdFromName(name);

    const description =
      typeof options.description === 'string' && options.description.length > 0
        ? options.description
        : `A ${name} library for simplify.dev.`;

    info(
      dryRun
        ? `[dry-run] Would create repository ${owner}/${name} and connect it to library "${libraryId}".`
        : `Creating repository ${owner}/${name}...`,
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

    const repositorySummary = await createGitHubRepository(appClient, installationId, {
      owner,
      name,
      description,
      visibility,
      dryRun,
      json,
    });

    if (dryRun) {
      info('[dry-run] Would scaffold library and associate repository.', json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    const manifest = await generateScaffold(targetDir, {
      libraryId,
      name,
      description,
      license: DEFAULT_LICENSE,
      dryRun: false,
      json,
    });

    const libraryValidation = validateLibraryManifest(manifest);
    if (!libraryValidation.valid) {
      const issues = libraryValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Generated library manifest is invalid:\n${issues}`, 'INVALID_MANIFEST');
    }

    const assetValidation = validateAssetManifest(buildExampleAssetManifest(DEFAULT_LICENSE));
    if (!assetValidation.valid) {
      const issues = assetValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Generated asset manifest is invalid:\n${issues}`, 'INVALID_MANIFEST');
    }

    const store = new InMemoryRepositoryLinkStore();
    const connectionService = new GitHubConnectionService({
      appClient,
      repositoryStore: store,
    });

    try {
      await connectionService.linkRepository({
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
          `Repository ${owner}/${name} is already linked to a different library.`,
          'REPOSITORY_ALREADY_LINKED',
        );
      }
      if (githubErr.code === 'library_already_linked') {
        throw new CliError(
          `Library ${libraryId} is already linked to a different repository.`,
          'LIBRARY_ALREADY_LINKED',
        );
      }
      throw new CliError(`Failed to link repository: ${githubErr.message}`, 'LINK_FAILED');
    }

    success(`Created and connected ${owner}/${name} to library "${libraryId}".`, json);
    info(`Repository URL: ${repositorySummary.url}`, json);
    info(`Library: ${libraryId}`, json);
    info(`Default branch: ${repositorySummary.defaultBranch}`, json);
    info(`Visibility: ${repositorySummary.visibility}`, json);
    info(
      'Push your library code to GitHub. GitHub is the canonical source of the library implementation.',
      json,
    );
    info(
      'Next: run simplify library build, then publish through the GitHub Actions workflow.',
      json,
    );
  },
};
