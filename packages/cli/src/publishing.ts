import {
  InMemoryPublishingAttemptStore,
  InMemoryPublishingCredentialStore,
  InMemoryPublishingProvenanceStore,
  PublishingAttemptService,
  PublishingAuthService,
  readGitHubActionsContext,
  readPublishTokenScope,
  resolveWorkflowPublisher,
  toPublishingCredentialScope,
  type GitHubActionsEnvironmentContext,
  type PublisherIdentity,
  type PublishingAttemptSource,
  type PublishingCredentialScope,
  type PublishingRepository,
  type RepositoryLink,
} from '@simplify-dev/github';

/**
 * Process-local stores for publishing attempt history. They are intentionally
 * in-memory foundations: a hosted registry must persist the same contracts.
 * Within a single CLI process they make status reporting and retry checks
 * possible without pretending that history survives between invocations.
 */
export const publishingAttemptStore = new InMemoryPublishingAttemptStore();
export const publishingProvenanceStore = new InMemoryPublishingProvenanceStore();
export const publishingCredentialStore = new InMemoryPublishingCredentialStore();

export const publishingAttemptService = new PublishingAttemptService({
  store: publishingAttemptStore,
});

export const publishingAuthService = new PublishingAuthService({
  credentialStore: publishingCredentialStore,
});

export function readPublishingEnvironment(): GitHubActionsEnvironmentContext {
  return readGitHubActionsContext(process.env);
}

export function resolvePublishingPublisher(
  environment: GitHubActionsEnvironmentContext,
): PublisherIdentity {
  return resolveWorkflowPublisher(environment);
}

export function readPublishingTokenScope(): PublishingCredentialScope | undefined {
  const scope = toPublishingCredentialScope(readPublishTokenScope(process.env));
  return Object.keys(scope).length > 0 ? scope : undefined;
}

export function publishingRepositoryFromLink(link: RepositoryLink): PublishingRepository {
  return {
    repositoryId: link.repositoryId,
    owner: link.owner,
    name: link.name,
    url: link.url,
  };
}

export function publishingSourceFromLink(
  link: RepositoryLink,
  extras: Omit<PublishingAttemptSource, 'repositoryId' | 'owner' | 'name'> = {},
): PublishingAttemptSource {
  return {
    repositoryId: link.repositoryId,
    owner: link.owner,
    name: link.name,
    ...extras,
  };
}

export function resetPublishingState(): void {
  publishingAttemptStore.clear();
  publishingProvenanceStore.clear();
  publishingCredentialStore.clear();
}
