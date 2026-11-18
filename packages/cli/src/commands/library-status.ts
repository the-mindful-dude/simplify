import type { Command } from './index.js';
import { CliError, info, success } from '../cli.js';
import {
  createGitHubAppClient,
  loadGitHubAppConfig,
  GitHubConnectionService,
  RepositoryMetadataService,
  InMemoryRepositoryLinkStore,
  type GitHubAppClient,
} from '@simplify-dev/github';

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

export const libraryStatusCommand: Command = {
  name: 'library-status',
  description: 'Display the GitHub connection status for a simplify.dev library.',
  options: [
    {
      name: 'installation-id',
      type: 'string',
      description: 'GitHub App installation id (or set GITHUB_INSTALLATION_ID).',
    },
    {
      name: 'refresh',
      type: 'boolean',
      description: 'Refresh repository metadata from GitHub before displaying status.',
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
    const { args, options, dryRun, json } = context;

    const libraryId = args[0];
    if (!libraryId) {
      throw new CliError(
        'Missing required argument: <libraryId>. Usage: simplify library status <libraryId>',
        'MISSING_ARGUMENT',
      );
    }

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
    const metadataService = new RepositoryMetadataService({
      appClient,
      repositoryStore: store,
    });

    let link = await connectionService.getLibraryRepository(libraryId);
    if (!link) {
      throw new CliError(
        `Library "${libraryId}" is not connected to a GitHub repository.`,
        'LIBRARY_NOT_CONNECTED',
      );
    }

    if (options.refresh && !dryRun) {
      try {
        link = await metadataService.synchronize(installationId, link.repositoryId);
        info('Repository metadata refreshed from GitHub.', json);
      } catch (err) {
        const githubErr = err as { readonly code?: string; readonly message: string };
        if (githubErr.code === 'repository_not_found') {
          throw new CliError(
            `Repository ${link.owner}/${link.name} is no longer accessible. ` +
              'It may have been renamed, transferred, deleted, or access may have been revoked.',
            'REPOSITORY_NOT_ACCESSIBLE',
          );
        }
        throw new CliError(
          `Failed to refresh repository metadata: ${githubErr.message}`,
          'REFRESH_FAILED',
        );
      }
    } else if (options.refresh && dryRun) {
      info(`[dry-run] Would refresh metadata for ${link.owner}/${link.name}.`, json);
    }

    if (dryRun) {
      info('[dry-run] Would display library status.', json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    if (json) {
      console.log(
        JSON.stringify(
          {
            libraryId,
            repository: {
              repositoryId: link.repositoryId,
              owner: link.owner,
              name: link.name,
              fullName: `${link.owner}/${link.name}`,
              url: link.url,
              defaultBranch: link.defaultBranch,
              visibility: link.visibility,
              status: link.status,
              linkedAt: link.linkedAt,
              latestCommitSha: link.latestCommitSha,
              metadataUpdatedAt: link.metadataUpdatedAt,
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    success(`Library "${libraryId}" connection status:`, json);
    info(`  Repository: ${link.owner}/${link.name}`, json);
    info(`  URL: ${link.url}`, json);
    info(`  Default branch: ${link.defaultBranch}`, json);
    info(`  Visibility: ${link.visibility}`, json);
    info(`  Status: ${link.status}`, json);
    info(`  Linked at: ${link.linkedAt}`, json);
    if (link.latestCommitSha) {
      info(`  Latest commit: ${link.latestCommitSha}`, json);
    }
    if (link.metadataUpdatedAt) {
      info(`  Metadata updated at: ${link.metadataUpdatedAt}`, json);
    }

    switch (link.status) {
      case 'inaccessible':
        info('Repository access has been revoked. Published versions are preserved.', json);
        break;
      case 'deleted':
        info('Repository has been deleted. Published versions are preserved.', json);
        break;
      case 'transferred':
        info('Repository has been transferred. Published versions are preserved.', json);
        break;
      default:
        info('Repository is accessible and synchronized.', json);
    }
  },
};
