import type { InstallationToken } from '../ports.js';

/**
 * Credential sources supported by the simplify.dev publishing authentication
 * contract. GitHub App installation tokens are short-lived and preferred.
 * Scoped simplify.dev publishing tokens are an explicit fallback for
 * environments where a token exchange is not yet available.
 */
export type PublishingCredentialKind = 'github-app-installation-token' | 'simplify-publish-token';

export type PublishingAuthVerification =
  'github-app-installation-token' | 'credential-store' | 'configured-scope';

export type PublisherType = 'user' | 'github-app' | 'service';

export interface PublisherIdentity {
  readonly publisher: string;
  readonly type: PublisherType;
  readonly actor?: string;
  readonly appSlug?: string;
}

export interface PublishingRepository {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly url?: string;
}

/**
 * Scopes attached to a publishing credential. Empty or omitted collections
 * mean the credential is not restricted along that dimension; callers should
 * prefer explicit scopes for long-lived credentials.
 */
export interface PublishingCredentialScope {
  readonly libraryIds?: readonly string[];
  readonly repositoryIds?: readonly string[];
  readonly repositories?: readonly string[];
  readonly publisher?: string;
}

export interface PublishingAuthorizationRequest {
  readonly libraryId: string;
  readonly repository: PublishingRepository;
  readonly commitSha?: string;
  readonly tag?: string;
  readonly intendedVersion?: string;
}

export interface PublishingAuthContext {
  readonly credentialId: string;
  readonly credentialKind: PublishingCredentialKind;
  readonly verification: PublishingAuthVerification;
  readonly publisher: PublisherIdentity;
  readonly scopes: PublishingCredentialScope;
  readonly libraryId: string;
  readonly repository: PublishingRepository;
  readonly authenticatedAt: string;
  readonly expiresAt?: string;
}

export interface IssuePublishingCredentialInput {
  readonly kind: PublishingCredentialKind;
  readonly publisher: PublisherIdentity;
  readonly scopes: PublishingCredentialScope;
  readonly expiresAt?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface PublishingCredentialRecord {
  readonly credentialId: string;
  readonly kind: PublishingCredentialKind;
  readonly publisher: PublisherIdentity;
  readonly scopes: PublishingCredentialScope;
  readonly fingerprint: string;
  readonly issuedAt: string;
  readonly expiresAt?: string;
  readonly revokedAt?: string;
  readonly rotatedAt?: string;
  readonly replacedBy?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface IssuedPublishingCredential {
  readonly credential: PublishingCredentialRecord;
  /** Returned exactly once. Never persist or log this value. */
  readonly token: string;
}

export interface RotatePublishingCredentialInput {
  readonly expiresAt?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface PublishingCredentialStore {
  issue(input: IssuePublishingCredentialInput): Promise<IssuedPublishingCredential>;
  findById(credentialId: string): Promise<PublishingCredentialRecord | undefined>;
  findByFingerprint(fingerprint: string): Promise<PublishingCredentialRecord | undefined>;
  list(): Promise<readonly PublishingCredentialRecord[]>;
  revoke(credentialId: string, revokedAt?: string): Promise<PublishingCredentialRecord | undefined>;
  rotate(
    credentialId: string,
    input?: RotatePublishingCredentialInput,
  ): Promise<IssuedPublishingCredential | undefined>;
  clear(): void;
}

export interface PublishingTokenScopeConfiguration {
  readonly libraryId?: string;
  readonly repository?: string;
  readonly publisher?: string;
}

export interface GitHubWorkflowRunReference {
  readonly runId?: string;
  readonly runAttempt?: number;
  readonly workflow?: string;
  readonly eventName?: string;
  readonly ref?: string;
  readonly branch?: string;
  readonly commitSha?: string;
  readonly actor?: string;
  readonly repository?: string;
  readonly url?: string;
}

export interface GitHubActionsEnvironmentContext {
  readonly workflowRun?: GitHubWorkflowRunReference;
  readonly actor?: string;
  readonly repository?: string;
  readonly ref?: string;
  readonly branch?: string;
  readonly commitSha?: string;
  readonly eventName?: string;
  /** Whether a simplify.dev publishing token was provided. The value is never exposed. */
  readonly publishTokenPresent: boolean;
}

export type PublishingAttemptKind = 'validation' | 'synchronization' | 'build' | 'publish';

export type PublishingAttemptStatus = 'pending' | 'running' | 'successful' | 'failed';

export interface PublishingAttemptSource {
  readonly repositoryId?: string;
  readonly owner?: string;
  readonly name?: string;
  readonly branch?: string;
  readonly commitSha?: string;
  readonly tag?: string;
  readonly intendedVersion?: string;
}

export interface PublishingValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly keyword?: string;
}

export interface PublishingValidationResult {
  readonly valid: boolean;
  readonly issues: readonly PublishingValidationIssue[];
}

export interface PublishingAttemptFailure {
  readonly code?: string;
  readonly message: string;
  readonly details?: string;
}

export interface PublishingAttemptArtifact {
  readonly url?: string;
  readonly integrity?: string;
}

export interface PublishingAttempt {
  readonly attemptId: string;
  readonly libraryId: string;
  readonly kind: PublishingAttemptKind;
  readonly status: PublishingAttemptStatus;
  readonly attemptNumber: number;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly retryOf?: string;
  readonly idempotencyKey?: string;
  readonly dryRun?: boolean;
  readonly reusedExisting?: boolean;
  readonly workflowRun?: GitHubWorkflowRunReference;
  readonly source?: PublishingAttemptSource;
  readonly publisher?: PublisherIdentity;
  readonly credentialKind?: PublishingCredentialKind;
  readonly validation?: PublishingValidationResult;
  readonly failure?: PublishingAttemptFailure;
  readonly artifact?: PublishingAttemptArtifact;
  readonly resultUrl?: string;
}

export interface PublishingAttemptQuery {
  readonly libraryId?: string;
  readonly kind?: PublishingAttemptKind;
  readonly status?: PublishingAttemptStatus;
  readonly idempotencyKey?: string;
  readonly limit?: number;
}

export interface PublishingAttemptStore {
  save(attempt: PublishingAttempt): Promise<void>;
  get(attemptId: string): Promise<PublishingAttempt | undefined>;
  list(query?: PublishingAttemptQuery): Promise<readonly PublishingAttempt[]>;
  latest(libraryId: string, kind?: PublishingAttemptKind): Promise<PublishingAttempt | undefined>;
  findSuccessful(
    libraryId: string,
    kind: PublishingAttemptKind,
    idempotencyKey: string,
  ): Promise<PublishingAttempt | undefined>;
  clear(): void;
}

export interface PublishingProvenanceRecord {
  readonly publicationId: string;
  readonly libraryId: string;
  readonly version: string;
  readonly repository: PublishingRepository;
  readonly commitSha: string;
  readonly tag?: string;
  readonly publisher: PublisherIdentity;
  readonly credentialKind: PublishingCredentialKind;
  readonly verification: PublishingAuthVerification;
  readonly publishedAt: string;
  readonly workflowRun?: GitHubWorkflowRunReference;
}

export interface PublishingProvenanceStore {
  record(record: PublishingProvenanceRecord): Promise<void>;
  list(libraryId?: string): Promise<readonly PublishingProvenanceRecord[]>;
  latestForLibrary(libraryId: string): Promise<PublishingProvenanceRecord | undefined>;
  clear(): void;
}

export interface InstallationTokenAuthInput {
  readonly token: InstallationToken;
  readonly request: PublishingAuthorizationRequest;
  readonly authorized: {
    readonly libraryId: string;
    readonly repository: PublishingRepository;
  };
  readonly publisher: PublisherIdentity;
}

export interface PublishTokenAuthInput {
  readonly token: string;
  readonly request: PublishingAuthorizationRequest;
  readonly authorized?: {
    readonly libraryId: string;
    readonly repository: PublishingRepository;
  };
  readonly fallbackScope?: PublishingCredentialScope;
  readonly publisher?: PublisherIdentity;
}
