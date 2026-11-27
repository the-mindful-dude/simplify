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
  record(record: WebhookDeliveryRecord): Promise<void>;
  /**
   * Atomically reserves a delivery id.
   *
   * Returns `true` when this caller owns the delivery and `false` when it was
   * already claimed. Implementations must not interleave an await between the
   * membership check and the reservation, or concurrent duplicates can both
   * be processed.
   */
  claim(record: WebhookDeliveryRecord): Promise<boolean>;
}

/** Normalized repository lifecycle data passed to an injected event port. */
export interface RepositoryLifecycleEvent {
  readonly action: string;
  readonly repositoryId?: string;
  readonly fullName?: string;
  readonly installationId?: number;
}

/** Normalized installation lifecycle data passed to an injected event port. */
export interface InstallationLifecycleEvent {
  readonly event: 'installation' | 'installation_repositories';
  readonly action: string;
  readonly installationId?: number;
  readonly account?: string;
  readonly repositoryIds: readonly string[];
}

/**
 * Optional sinks for webhook lifecycle events. Implementations own any
 * side effects; the webhook handler performs no GitHub API calls of its own.
 */
export interface WebhookEventPort {
  onRepositoryLifecycle?(event: RepositoryLifecycleEvent): Promise<void> | void;
  onInstallationLifecycle?(event: InstallationLifecycleEvent): Promise<void> | void;
}
