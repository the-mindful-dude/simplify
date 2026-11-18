import type { Command } from './index.js';
import { CliError, info, success } from '../cli.js';
import {
  createGitHubAppClient,
  loadGitHubAppConfig,
  GitHubConnectionService,
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

export const libraryDisconnectCommand: Command = {
  name: 'library-disconnect',
  description: 'Disconnect a GitHub repository from its simplify.dev library.',
  options: [
    {
      name: 'installation-id',
      type: 'string',
      description: 'GitHub App installation id (or set GITHUB_INSTALLATION_ID).',
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

    const repositoryIdOrLibraryId = args[0];
    if (!repositoryIdOrLibraryId) {
      throw new CliError(
        'Missing required argument: <repositoryId|libraryId>. Usage: simplify library disconnect <repositoryId|libraryId>',
        'MISSING_ARGUMENT',
      );
    }

    const installationId =
      typeof options['installation-id'] === 'string'
        ? Number(options['installation-id'])
        : undefined;
    if (!installationId || !Number.isSafeInteger(installationId) || installationId <= 0) {
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

    let repositoryId = repositoryIdOrLibraryId;

    let existing = await store.findByRepositoryId(repositoryId);
    if (!existing && !/^\d+$/.test(repositoryIdOrLibraryId)) {
      // The argument looks like a library id rather than a numeric repository id;
      // resolve the repository id through the existing link.
      const resolved = await connectionService.getLibraryRepository(repositoryIdOrLibraryId);
      if (!resolved) {
        throw new CliError(
          `No linked repository found for library "${repositoryIdOrLibraryId}".`,
          'LINK_NOT_FOUND',
        );
      }
      repositoryId = resolved.repositoryId;
      existing = resolved;
      info(
        `Resolved library "${repositoryIdOrLibraryId}" to repository ${existing.owner}/${existing.name}.`,
        json,
      );
    }

    if (!existing) {
      throw new CliError(
        `No repository link found for "${repositoryIdOrLibraryId}".`,
        'LINK_NOT_FOUND',
      );
    }

    info(
      dryRun
        ? `[dry-run] Would disconnect repository ${existing.owner}/${existing.name} from library ${existing.libraryId}.`
        : `Disconnecting repository ${existing.owner}/${existing.name} from library ${existing.libraryId}...`,
      json,
    );

    if (dryRun) {
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    await connectionService.disconnectRepository(repositoryId);

    success(
      `Disconnected ${existing.owner}/${existing.name} from library "${existing.libraryId}".`,
      json,
    );
    info('Published versions are preserved. The repository can be reconnected later.', json);
  },
};
