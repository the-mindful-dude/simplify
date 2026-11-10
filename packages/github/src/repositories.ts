import { GitHubIntegrationError } from './errors.js';
import type {
  GitHubAppClient,
  GitHubInstallation,
  GitHubRepositorySummary,
  GitHubUser,
  RepositoryLink,
  RepositoryLinkStore,
} from './ports.js';

export interface GitHubConnectionServiceOptions {
  readonly appClient: GitHubAppClient;
  readonly repositoryStore: RepositoryLinkStore;
  readonly now?: () => Date;
}

export interface LinkRepositoryInput {
  readonly repository: GitHubRepositorySummary;
  readonly libraryId: string;
}

export class GitHubConnectionService {
  private readonly appClient: GitHubAppClient;
  private readonly repositoryStore: RepositoryLinkStore;
  private readonly now: () => Date;

  constructor(options: GitHubConnectionServiceOptions) {
    this.appClient = options.appClient;
    this.repositoryStore = options.repositoryStore;
    this.now = options.now ?? (() => new Date());
  }

  async getInstallationStatus(installationId: number): Promise<GitHubInstallation> {
    return this.appClient.getInstallation(installationId);
  }

  async listRepositories(installationId: number): Promise<GitHubRepositorySummary[]> {
    return this.appClient.listInstallationRepositories(installationId);
  }

  async getAuthenticatedUser(token: string): Promise<GitHubUser> {
    return this.appClient.getAuthenticatedUser(token);
  }

  async linkRepository(input: LinkRepositoryInput): Promise<RepositoryLink> {
    const byRepository = await this.repositoryStore.findByRepositoryId(
      input.repository.repositoryId,
    );
    if (byRepository && byRepository.libraryId !== input.libraryId) {
      throw new GitHubIntegrationError(
        'repository_already_linked',
        `Repository ${input.repository.fullName} is already linked to library ${byRepository.libraryId}.`,
      );
    }

    const byLibrary = await this.repositoryStore.findByLibraryId(input.libraryId);
    if (byLibrary && byLibrary.repositoryId !== input.repository.repositoryId) {
      throw new GitHubIntegrationError(
        'library_already_linked',
        `Library ${input.libraryId} is already linked to repository ${byLibrary.owner}/${byLibrary.name}.`,
      );
    }

    const link: RepositoryLink = {
      repositoryId: input.repository.repositoryId,
      owner: input.repository.owner,
      name: input.repository.name,
      url: input.repository.url,
      defaultBranch: input.repository.defaultBranch,
      visibility: input.repository.visibility,
      libraryId: input.libraryId,
      linkedAt: byRepository?.linkedAt ?? this.now().toISOString(),
      status: 'active',
    };

    await this.repositoryStore.save(link);
    return link;
  }

  async disconnectRepository(repositoryId: string): Promise<void> {
    await this.repositoryStore.delete(repositoryId);
  }

  async getLibraryRepository(libraryId: string): Promise<RepositoryLink | undefined> {
    return this.repositoryStore.findByLibraryId(libraryId);
  }
}
