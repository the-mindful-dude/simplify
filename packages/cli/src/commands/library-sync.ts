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
import { validateDevelopmentSnapshot, type DevelopmentSnapshot } from '@simplify-dev/registry';
import type { LibraryManifest } from '@simplify-dev/schemas';

const LIBRARY_MANIFEST_PATH = 'simplify/library.json';

interface DevelopmentSnapshotStore {
  readonly has: (libraryId: string, branch: string, commitSha: string) => Promise<boolean>;
  readonly record: (snapshot: DevelopmentSnapshot) => Promise<void>;
  readonly latestForBranch: (
    libraryId: string,
    branch: string,
  ) => Promise<DevelopmentSnapshot | undefined>;
  readonly clear: () => void;
}

class InMemoryDevelopmentSnapshotStore implements DevelopmentSnapshotStore {
  private readonly snapshots = new Map<string, DevelopmentSnapshot>();
  private key(libraryId: string, branch: string, commitSha: string): string {
    return `${libraryId}\0${branch}\0${commitSha}`;
  }
  async has(libraryId: string, branch: string, commitSha: string): Promise<boolean> {
    return this.snapshots.has(this.key(libraryId, branch, commitSha));
  }
  async record(snapshot: DevelopmentSnapshot): Promise<void> {
    this.snapshots.set(this.key(snapshot.libraryId, snapshot.branch, snapshot.commitSha), snapshot);
  }
  async latestForBranch(
    libraryId: string,
    branch: string,
  ): Promise<DevelopmentSnapshot | undefined> {
    let latest: DevelopmentSnapshot | undefined;
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.libraryId === libraryId && snapshot.branch === branch) {
        if (!latest || snapshot.createdAt > latest.createdAt) {
          latest = snapshot;
        }
      }
    }
    return latest;
  }
  clear(): void {
    this.snapshots.clear();
  }
}

export const developmentSnapshotStore = new InMemoryDevelopmentSnapshotStore();

async function createAppClient(): Promise<GitHubAppClient> {
  let config;
  try {
    config = loadGitHubAppConfig();
  } catch {
    throw new CliError(
      'GitHub App configuration is incomplete. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, and GITHUB_APP_WEBHOOK_SECRET.',
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

async function readLibraryManifestIfPresent(
  targetDir: string,
): Promise<LibraryManifest | undefined> {
  const manifestPath = join(targetDir, LIBRARY_MANIFEST_PATH);
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as LibraryManifest;
  } catch {
    return undefined;
  }
}

export const librarySyncCommand: Command = {
  name: 'library-sync',
  description:
    'Synchronize a development snapshot from a connected GitHub branch. Ordinary pushes never create stable releases.',
  options: [
    {
      name: 'branch',
      type: 'string',
      description:
        'Branch to synchronize (defaults to the repository default branch). Automatic sync is disabled by default; run this command or a workflow dispatch to synchronize.',
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
        'Directory containing the library manifest (defaults to the current working directory).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
    { name: 'json', type: 'boolean', description: 'Machine-readable JSON output.' },
  ],
  handler: async (context) => {
    const { args, options: rawOptions, dryRun, json } = context;
    const libraryId = args[0];
    if (!libraryId) {
      throw new CliError(
        'Missing required argument: <libraryId>. Usage: simplify library sync <libraryId>',
        'MISSING_ARGUMENT',
      );
    }
    const branch =
      typeof rawOptions.branch === 'string' && rawOptions.branch.length > 0
        ? rawOptions.branch
        : undefined;
    const targetDir =
      typeof rawOptions['target-dir'] === 'string' && rawOptions['target-dir'].length > 0
        ? rawOptions['target-dir']
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
        ? `[dry-run] Would synchronize development snapshot for library "${libraryId}" in ${targetDir}.`
        : `Synchronizing development snapshot for library "${libraryId}"...`,
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
    const connectionService = new GitHubConnectionService({ appClient, repositoryStore: store });
    const link = await connectionService.getLibraryRepository(libraryId);
    if (!link) {
      throw new CliError(
        `Library "${libraryId}" is not connected to a GitHub repository.`,
        'NOT_CONNECTED',
      );
    }
    const manifest = await readLibraryManifestIfPresent(targetDir);
    if (manifest && manifest.id !== libraryId) {
      throw new CliError(
        `Local library manifest id "${manifest.id}" does not match "${libraryId}".`,
        'LIBRARY_ID_MISMATCH',
      );
    }
    const syncBranch = branch ?? link.defaultBranch;
    info(`Reading latest commit from branch ${syncBranch} of ${link.owner}/${link.name}...`, json);
    let commitSha: string;
    try {
      commitSha = await appClient.getLatestCommitSha(
        installationId,
        link.owner,
        link.name,
        syncBranch,
      );
    } catch (err) {
      const githubErr = err as { readonly code?: string; readonly message: string };
      throw new CliError(
        `Failed to read latest commit for branch ${syncBranch}: ${githubErr.message}`,
        'FETCH_COMMIT_FAILED',
      );
    }
    const alreadySynced = await developmentSnapshotStore.has(libraryId, syncBranch, commitSha);
    if (alreadySynced) {
      info(`Development snapshot already up to date: ${syncBranch}@${commitSha}`, json);
      if (json) {
        console.log(
          JSON.stringify(
            { libraryId, branch: syncBranch, commitSha, status: 'up-to-date', created: false },
            null,
            2,
          ),
        );
      }
      return;
    }
    const snapshot: DevelopmentSnapshot = {
      libraryId,
      branch: syncBranch,
      commitSha,
      createdAt: new Date().toISOString(),
      kind: 'development',
    };
    const validation = validateDevelopmentSnapshot(snapshot);
    if (!validation.valid) {
      throw new CliError('Generated development snapshot is invalid.', 'INVALID_SNAPSHOT');
    }
    if (dryRun) {
      info(`[dry-run] Would create development snapshot ${syncBranch}@${commitSha}.`, json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }
    await developmentSnapshotStore.record(snapshot);
    const latest = await developmentSnapshotStore.latestForBranch(libraryId, syncBranch);
    success(`Synchronized development snapshot: ${syncBranch}@${commitSha}`, json);
    info(`Library: ${libraryId}`, json);
    info(`Branch: ${syncBranch}`, json);
    info(`Commit: ${commitSha}`, json);
    info('Snapshot kind: development (does not affect stable version resolution)', json);
    if (manifest) {
      info(`Manifest: ${manifest.name} (${manifest.version})`, json);
    }
    if (json) {
      console.log(
        JSON.stringify(
          {
            libraryId,
            branch: syncBranch,
            commitSha,
            status: 'synced',
            created: true,
            latestSnapshot: latest,
          },
          null,
          2,
        ),
      );
    }
  },
};
