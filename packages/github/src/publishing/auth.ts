import type { PublishingAuthContext, PublishingCredentialScope } from './types.js';
import type {
  GitHubActionsEnvironmentContext,
  InstallationTokenAuthInput,
  IssuedPublishingCredential,
  PublisherIdentity,
  PublishingAuthorizationRequest,
  PublishingCredentialRecord,
  PublishingCredentialStore,
  PublishingRepository,
  PublishingTokenScopeConfiguration,
  PublishTokenAuthInput,
  RotatePublishingCredentialInput,
} from './types.js';
import { fingerprintPublishingToken } from './tokens.js';

export type PublishingAuthenticationErrorCode =
  | 'credential_missing'
  | 'credential_invalid'
  | 'credential_expired'
  | 'credential_revoked'
  | 'scope_mismatch'
  | 'repository_mismatch'
  | 'library_mismatch';

export class PublishingAuthenticationError extends Error {
  readonly code: PublishingAuthenticationErrorCode;

  constructor(code: PublishingAuthenticationErrorCode, message: string) {
    super(message);
    this.name = 'PublishingAuthenticationError';
    this.code = code;
  }
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function parseRunAttempt(value: string | undefined): number | undefined {
  const raw = trimmed(value);
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveBranch(ref: string | undefined, headRef: string | undefined): string | undefined {
  if (headRef) {
    return headRef;
  }
  const prefix = 'refs/heads/';
  return ref?.startsWith(prefix) ? ref.slice(prefix.length) : undefined;
}

/**
 * Read GitHub Actions run metadata without touching credential values. Only a
 * boolean is retained for the presence of SIMPLIFY_PUBLISH_TOKEN so the token
 * can never be logged or persisted through this context.
 */
export function readGitHubActionsContext(
  env: NodeJS.ProcessEnv = process.env,
): GitHubActionsEnvironmentContext {
  const runId = trimmed(env.GITHUB_RUN_ID);
  const runAttempt = parseRunAttempt(env.GITHUB_RUN_ATTEMPT);
  const workflow = trimmed(env.GITHUB_WORKFLOW);
  const eventName = trimmed(env.GITHUB_EVENT_NAME);
  const ref = trimmed(env.GITHUB_REF);
  const branch = resolveBranch(ref, trimmed(env.GITHUB_HEAD_REF));
  const commitSha = trimmed(env.GITHUB_SHA);
  const actor = trimmed(env.GITHUB_ACTOR);
  const repository = trimmed(env.GITHUB_REPOSITORY);
  const serverUrl = trimmed(env.GITHUB_SERVER_URL) ?? 'https://github.com';

  let url: string | undefined;
  if (runId && repository) {
    url = `${serverUrl}/${repository}/actions/runs/${runId}`;
    if (runAttempt !== undefined && runAttempt > 1) {
      url = `${url}/attempts/${runAttempt}`;
    }
  }

  const workflowRun =
    runId || runAttempt || workflow || eventName || ref || commitSha || actor || repository || url
      ? {
          ...(runId ? { runId } : {}),
          ...(runAttempt !== undefined ? { runAttempt } : {}),
          ...(workflow ? { workflow } : {}),
          ...(eventName ? { eventName } : {}),
          ...(ref ? { ref } : {}),
          ...(branch ? { branch } : {}),
          ...(commitSha ? { commitSha } : {}),
          ...(actor ? { actor } : {}),
          ...(repository ? { repository } : {}),
          ...(url ? { url } : {}),
        }
      : undefined;

  return {
    ...(workflowRun ? { workflowRun } : {}),
    ...(actor ? { actor } : {}),
    ...(repository ? { repository } : {}),
    ...(ref ? { ref } : {}),
    ...(branch ? { branch } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(eventName ? { eventName } : {}),
    publishTokenPresent: Boolean(trimmed(env.SIMPLIFY_PUBLISH_TOKEN)),
  };
}

/**
 * Read the declared scope of a simplify.dev publishing token from the
 * environment. Long-lived fallback tokens should always be scoped to a single
 * library and repository.
 */
export function readPublishTokenScope(
  env: NodeJS.ProcessEnv = process.env,
): PublishingTokenScopeConfiguration {
  const libraryId = trimmed(env.SIMPLIFY_PUBLISH_LIBRARY_ID) ?? trimmed(env.SIMPLIFY_LIBRARY_ID);
  const repository = trimmed(env.SIMPLIFY_PUBLISH_REPOSITORY) ?? trimmed(env.GITHUB_REPOSITORY);
  const publisher = trimmed(env.SIMPLIFY_PUBLISHER) ?? trimmed(env.GITHUB_ACTOR);
  return {
    ...(libraryId ? { libraryId } : {}),
    ...(repository ? { repository } : {}),
    ...(publisher ? { publisher } : {}),
  };
}

export function resolveWorkflowPublisher(
  context: GitHubActionsEnvironmentContext,
): PublisherIdentity {
  if (context.actor) {
    return { publisher: context.actor, type: 'user', actor: context.actor };
  }
  return { publisher: 'github-actions', type: 'service' };
}

export function toPublishingCredentialScope(
  configuration: PublishingTokenScopeConfiguration,
): PublishingCredentialScope {
  return {
    ...(configuration.libraryId ? { libraryIds: [configuration.libraryId] } : {}),
    ...(configuration.repository ? { repositories: [configuration.repository] } : {}),
    ...(configuration.publisher ? { publisher: configuration.publisher } : {}),
  };
}

function repositoriesMatch(left: PublishingRepository, right: PublishingRepository): boolean {
  if (left.repositoryId && right.repositoryId && left.repositoryId !== right.repositoryId) {
    return false;
  }
  return left.owner === right.owner && left.name === right.name;
}

function assertAuthorizedRepository(
  request: PublishingAuthorizationRequest,
  authorized: { readonly libraryId: string; readonly repository: PublishingRepository },
): void {
  if (request.libraryId !== authorized.libraryId) {
    throw new PublishingAuthenticationError(
      'library_mismatch',
      `Publishing request for library "${request.libraryId}" does not match the authorized library "${authorized.libraryId}".`,
    );
  }
  if (!repositoriesMatch(request.repository, authorized.repository)) {
    throw new PublishingAuthenticationError(
      'repository_mismatch',
      `Publishing request for repository ${request.repository.owner}/${request.repository.name} does not match the authorized repository ${authorized.repository.owner}/${authorized.repository.name}.`,
    );
  }
}

function assertScopeAllows(
  scopes: PublishingCredentialScope,
  publisher: PublisherIdentity,
  request: PublishingAuthorizationRequest,
): void {
  if (scopes.libraryIds && scopes.libraryIds.length > 0) {
    if (!scopes.libraryIds.includes(request.libraryId)) {
      throw new PublishingAuthenticationError(
        'scope_mismatch',
        `Publishing credential is not scoped to library "${request.libraryId}".`,
      );
    }
  }

  if (scopes.repositoryIds && scopes.repositoryIds.length > 0) {
    if (
      !request.repository.repositoryId ||
      !scopes.repositoryIds.includes(request.repository.repositoryId)
    ) {
      throw new PublishingAuthenticationError(
        'scope_mismatch',
        `Publishing credential is not scoped to repository "${request.repository.repositoryId}".`,
      );
    }
  }

  if (scopes.repositories && scopes.repositories.length > 0) {
    const fullName = `${request.repository.owner}/${request.repository.name}`;
    if (!scopes.repositories.includes(fullName)) {
      throw new PublishingAuthenticationError(
        'scope_mismatch',
        `Publishing credential is not scoped to repository "${fullName}".`,
      );
    }
  }

  if (scopes.publisher && scopes.publisher !== publisher.publisher) {
    throw new PublishingAuthenticationError(
      'scope_mismatch',
      `Publishing credential is not scoped to publisher "${publisher.publisher}".`,
    );
  }
}

function assertNotExpired(expiresAt: string | undefined, now: Date): void {
  if (!expiresAt) {
    return;
  }
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry) || expiry <= now.getTime()) {
    throw new PublishingAuthenticationError(
      'credential_expired',
      'Publishing credential has expired. Rotate the credential or use a short-lived GitHub App installation token.',
    );
  }
}

export interface PublishingAuthServiceOptions {
  readonly credentialStore?: PublishingCredentialStore;
  readonly now?: () => Date;
}

export class PublishingAuthService {
  private readonly credentialStore: PublishingCredentialStore | undefined;
  private readonly now: () => Date;

  constructor(options: PublishingAuthServiceOptions = {}) {
    this.credentialStore = options.credentialStore;
    this.now = options.now ?? (() => new Date());
  }

  async authenticateInstallationToken(
    input: InstallationTokenAuthInput,
  ): Promise<PublishingAuthContext> {
    if (!input.token.token) {
      throw new PublishingAuthenticationError(
        'credential_missing',
        'A GitHub App installation token is required to authenticate publishing.',
      );
    }

    const now = this.now();
    assertNotExpired(input.token.expiresAt, now);
    assertAuthorizedRepository(input.request, input.authorized);

    const fingerprint = fingerprintPublishingToken(input.token.token);
    return {
      credentialId: `github-app-installation:${fingerprint.slice(0, 16)}`,
      credentialKind: 'github-app-installation-token',
      verification: 'github-app-installation-token',
      publisher: input.publisher,
      scopes: {},
      libraryId: input.authorized.libraryId,
      repository: input.authorized.repository,
      authenticatedAt: now.toISOString(),
      expiresAt: input.token.expiresAt,
    };
  }

  async authenticatePublishToken(input: PublishTokenAuthInput): Promise<PublishingAuthContext> {
    const token = input.token.trim();
    if (!token) {
      throw new PublishingAuthenticationError(
        'credential_missing',
        'A simplify.dev publishing token is required to authenticate publishing.',
      );
    }

    if (input.authorized) {
      assertAuthorizedRepository(input.request, input.authorized);
    }

    const now = this.now();
    const fingerprint = fingerprintPublishingToken(token);
    const stored = await this.credentialStore?.findByFingerprint(fingerprint);

    if (stored) {
      this.assertStoredCredentialUsable(stored, now);
      const publisher = stored.publisher;
      assertScopeAllows(stored.scopes, publisher, input.request);
      return {
        credentialId: stored.credentialId,
        credentialKind: stored.kind,
        verification: 'credential-store',
        publisher,
        scopes: stored.scopes,
        libraryId: input.request.libraryId,
        repository: input.request.repository,
        authenticatedAt: now.toISOString(),
        ...(stored.expiresAt ? { expiresAt: stored.expiresAt } : {}),
      };
    }

    if (!input.fallbackScope) {
      throw new PublishingAuthenticationError(
        'credential_invalid',
        'The simplify.dev publishing token is not recognized. Issue or rotate a credential, or scope the token with SIMPLIFY_PUBLISH_LIBRARY_ID and SIMPLIFY_PUBLISH_REPOSITORY.',
      );
    }

    const publisher = input.publisher ?? {
      publisher: input.fallbackScope.publisher ?? 'simplify-publish-token',
      type: 'service',
    };
    assertScopeAllows(input.fallbackScope, publisher, input.request);

    return {
      credentialId: `configured:${fingerprint.slice(0, 16)}`,
      credentialKind: 'simplify-publish-token',
      verification: 'configured-scope',
      publisher,
      scopes: input.fallbackScope,
      libraryId: input.request.libraryId,
      repository: input.request.repository,
      authenticatedAt: now.toISOString(),
    };
  }

  async revokeCredential(credentialId: string): Promise<PublishingCredentialRecord | undefined> {
    if (!this.credentialStore) {
      return undefined;
    }
    return this.credentialStore.revoke(credentialId, this.now().toISOString());
  }

  async rotateCredential(
    credentialId: string,
    input: RotatePublishingCredentialInput = {},
  ): Promise<IssuedPublishingCredential | undefined> {
    if (!this.credentialStore) {
      return undefined;
    }
    return this.credentialStore.rotate(credentialId, input);
  }

  private assertStoredCredentialUsable(credential: PublishingCredentialRecord, now: Date): void {
    if (credential.revokedAt) {
      throw new PublishingAuthenticationError(
        'credential_revoked',
        'Publishing credential has been revoked. Rotate the credential before publishing.',
      );
    }
    assertNotExpired(credential.expiresAt, now);
  }
}
