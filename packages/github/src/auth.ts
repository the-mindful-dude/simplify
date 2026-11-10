import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import type { GitHubAppConfig } from './config.js';
import { GitHubIntegrationError } from './errors.js';
import type {
  GitHubAppClient,
  GitHubInstallation,
  GitHubRepositorySummary,
  GitHubUser,
  InstallationToken,
} from './ports.js';

interface RepositoryPayload {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
  readonly default_branch: string;
  readonly private: boolean;
  readonly owner: { readonly login: string };
}

function toRepositorySummary(repository: RepositoryPayload): GitHubRepositorySummary {
  return {
    repositoryId: String(repository.id),
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    defaultBranch: repository.default_branch,
    visibility: repository.private ? 'private' : 'public',
  };
}

function authFailure(message: string, cause: unknown): GitHubIntegrationError {
  return new GitHubIntegrationError('auth_failed', message, { cause });
}

export function createGitHubAppClient(config: GitHubAppConfig): GitHubAppClient {
  const appAuth = createAppAuth({
    appId: config.appId,
    privateKey: config.privateKey,
  });

  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: config.appId, privateKey: config.privateKey },
  });

  const installationOctokit = (installationId: number): Octokit =>
    new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.appId,
        privateKey: config.privateKey,
        installationId,
      },
    });

  return {
    async createInstallationToken(installationId: number): Promise<InstallationToken> {
      try {
        const authentication = await appAuth({
          type: 'installation',
          installationId,
        });
        return {
          token: authentication.token,
          expiresAt: authentication.expiresAt,
        };
      } catch (error) {
        throw authFailure('Could not create a GitHub installation token.', error);
      }
    },

    async getInstallation(installationId: number): Promise<GitHubInstallation> {
      try {
        const { data } = await appOctokit.rest.apps.getInstallation({
          installation_id: installationId,
        });
        return {
          installationId: data.id,
          account: data.account.login,
          suspended: data.suspended_at !== null,
        };
      } catch (error) {
        throw new GitHubIntegrationError(
          'installation_not_found',
          `GitHub App installation ${installationId} is not accessible.`,
          { cause: error },
        );
      }
    },

    async listInstallationRepositories(
      installationId: number,
    ): Promise<GitHubRepositorySummary[]> {
      try {
        const octokit = installationOctokit(installationId);
        const repositories = await octokit.paginate(
          octokit.rest.apps.listReposAccessibleToInstallation,
          { per_page: 100 },
        );
        return repositories.map((repository) =>
          toRepositorySummary(repository as RepositoryPayload),
        );
      } catch (error) {
        throw authFailure(
          `Could not list repositories for installation ${installationId}.`,
          error,
        );
      }
    },

    async getRepository(
      installationId: number,
      owner: string,
      name: string,
    ): Promise<GitHubRepositorySummary> {
      try {
        const { data } = await installationOctokit(installationId).rest.repos.get({
          owner,
          repo: name,
        });
        return toRepositorySummary(data as RepositoryPayload);
      } catch (error) {
        throw new GitHubIntegrationError(
          'repository_not_found',
          `Repository ${owner}/${name} is not accessible to installation ${installationId}.`,
          { cause: error },
        );
      }
    },

    async getLatestCommitSha(
      installationId: number,
      owner: string,
      name: string,
      branch: string,
    ): Promise<string> {
      try {
        const { data } = await installationOctokit(installationId).rest.repos.getBranch(
          {
            owner,
            repo: name,
            branch,
          },
        );
        return data.commit.sha;
      } catch (error) {
        throw new GitHubIntegrationError(
          'repository_not_found',
          `Could not read branch ${branch} for ${owner}/${name}.`,
          { cause: error },
        );
      }
    },

    async getAuthenticatedUser(token: string): Promise<GitHubUser> {
      try {
        const { data } = await new Octokit({ auth: token }).rest.users.getAuthenticated();
        return {
          login: data.login,
          id: data.id,
          ...(data.name ? { name: data.name } : {}),
        };
      } catch (error) {
        throw authFailure('Could not read the authenticated GitHub user.', error);
      }
    },
  };
}
