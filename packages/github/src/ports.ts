import type { Visibility } from '@simplify-dev/schemas';

export interface GitHubRepositorySummary {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly url: string;
  readonly defaultBranch: string;
  readonly visibility: Visibility;
}

export interface GitHubUser {
  readonly login: string;
  readonly id: number;
  readonly name?: string;
}

export interface GitHubInstallation {
  readonly installationId: number;
  readonly account: string;
  readonly suspended: boolean;
}

export interface InstallationToken {
  readonly token: string;
  readonly expiresAt: string;
}

export interface GitHubAppClient {
  createInstallationToken(installationId: number): Promise<InstallationToken>;
  getInstallation(installationId: number): Promise<GitHubInstallation>;
  listInstallationRepositories(installationId: number): Promise<GitHubRepositorySummary[]>;
  getRepository(
    installationId: number,
    owner: string,
    name: string,
  ): Promise<GitHubRepositorySummary>;
  getLatestCommitSha(
    installationId: number,
    owner: string,
    name: string,
    branch: string,
  ): Promise<string>;
  getAuthenticatedUser(token: string): Promise<GitHubUser>;
}

export interface RepositoryLink {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly url: string;
  readonly defaultBranch: string;
  readonly visibility: Visibility;
  readonly libraryId: string;
  readonly linkedAt: string;
  readonly latestCommitSha?: string;
  readonly metadataUpdatedAt?: string;
  readonly status: 'active' | 'inaccessible' | 'deleted' | 'transferred';
}

export interface RepositoryLinkStore {
  findByRepositoryId(repositoryId: string): Promise<RepositoryLink | undefined>;
  findByLibraryId(libraryId: string): Promise<RepositoryLink | undefined>;
  list(): Promise<readonly RepositoryLink[]>;
  save(link: RepositoryLink): Promise<void>;
  delete(repositoryId: string): Promise<void>;
}

export interface WebhookDeliveryRecord {
  readonly deliveryId: string;
  readonly event: string;
  readonly receivedAt: string;
  readonly status: 'processed' | 'failed';
  readonly error?: string;
}

export interface WebhookDeliveryStore {
  has(deliveryId: string): Promise<boolean>;
  record(record: WebhookDeliveryRecord): Promise<void>;
  get(deliveryId: string): Promise<WebhookDeliveryRecord | undefined>;
}
