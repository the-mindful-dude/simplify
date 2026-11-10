import { GitHubIntegrationError } from './errors.js';
import type {
  GitHubAppClient,
  RepositoryLink,
  RepositoryLinkStore,
} from './ports.js';

export interface RepositoryMetadataServiceOptions {
  readonly appClient: GitHubAppClient;
  readonly repositoryStore: RepositoryLinkStore;
  readonly now?: () => Date;
}

export class RepositoryMetadataService {
  private readonly appClient: GitHubAppClient;
  private readonly repositoryStore: RepositoryLinkStore;
  private readonly now: () => Date;

  constructor(options: RepositoryMetadataServiceOptions) {
    this.appClient = options.appClient;
    this.repositoryStore = options.repositoryStore;
    this.now = options.now ?? (() => new Date());
  }

  async synchronize(installationId: number, repositoryId: string): Promise<RepositoryLink> {
    const existing = await this.repositoryStore.findByRepositoryId(repositoryId);
    if (!existing) {
      throw new GitHubIntegrationError(
        'repository_not_found',
        `Repository ${repositoryId} is not linked to a library.`,
      );
    }

    const repository = await this.appClient.getRepository(
      installationId,
      existing.owner,
      existing.name,
    );
    const latestCommitSha = await this.appClient.getLatestCommitSha(
      installationId,
      repository.owner,
      repository.name,
      repository.defaultBranch,
    );

    const updated: RepositoryLink = {
      ...existing,
      owner: repository.owner,
      name: repository.name,
      url: repository.url,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      latestCommitSha,
      metadataUpdatedAt: this.now().toISOString(),
      status: 'active',
    };

    await this.repositoryStore.save(updated);
    return updated;
  }

  async refresh(installationId: number, repositoryId: string): Promise<RepositoryLink> {
    return this.synchronize(installationId, repositoryId);
  }

  async markUnavailable(
    repositoryId: string,
    status: RepositoryLink['status'],
  ): Promise<RepositoryLink | undefined> {
    const existing = await this.repositoryStore.findByRepositoryId(repositoryId);
    if (!existing) {
      return undefined;
    }

    const updated: RepositoryLink = {
      ...existing,
      status,
      metadataUpdatedAt: this.now().toISOString(),
    };
    await this.repositoryStore.save(updated);
    return updated;
  }
}
