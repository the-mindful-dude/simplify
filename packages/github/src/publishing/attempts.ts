import { randomUUID } from 'node:crypto';

import type {
  GitHubWorkflowRunReference,
  PublishingAttempt,
  PublishingAttemptArtifact,
  PublishingAttemptFailure,
  PublishingAttemptKind,
  PublishingAttemptSource,
  PublishingAttemptStore,
  PublishingCredentialKind,
  PublishingValidationResult,
  PublisherIdentity,
} from './types.js';

export type PublishingAttemptStateErrorCode = 'attempt_not_found' | 'invalid_transition';

export class PublishingAttemptStateError extends Error {
  readonly code: PublishingAttemptStateErrorCode;

  constructor(code: PublishingAttemptStateErrorCode, message: string) {
    super(message);
    this.name = 'PublishingAttemptStateError';
    this.code = code;
  }
}

export interface CreatePublishingAttemptInput {
  readonly libraryId: string;
  readonly kind: PublishingAttemptKind;
  readonly workflowRun?: GitHubWorkflowRunReference;
  readonly source?: PublishingAttemptSource;
  readonly publisher?: PublisherIdentity;
  readonly credentialKind?: PublishingCredentialKind;
  readonly idempotencyKey?: string;
  readonly dryRun?: boolean;
}

export interface SucceedPublishingAttemptInput {
  readonly validation?: PublishingValidationResult;
  readonly artifact?: PublishingAttemptArtifact;
  readonly resultUrl?: string;
  readonly reusedExisting?: boolean;
}

export interface RetryPublishingAttemptInput {
  readonly workflowRun?: GitHubWorkflowRunReference;
  readonly source?: PublishingAttemptSource;
  readonly idempotencyKey?: string;
}

export interface PublishingAttemptServiceOptions {
  readonly store: PublishingAttemptStore;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

export class PublishingAttemptService {
  private readonly store: PublishingAttemptStore;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(options: PublishingAttemptServiceOptions) {
    this.store = options.store;
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? (() => `attempt_${randomUUID()}`);
  }

  async create(input: CreatePublishingAttemptInput): Promise<PublishingAttempt> {
    const now = this.now().toISOString();
    const attempt: PublishingAttempt = {
      attemptId: this.generateId(),
      libraryId: input.libraryId,
      kind: input.kind,
      status: 'pending',
      attemptNumber: await this.nextAttemptNumber(input),
      createdAt: now,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
      ...(input.workflowRun ? { workflowRun: input.workflowRun } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.publisher ? { publisher: input.publisher } : {}),
      ...(input.credentialKind ? { credentialKind: input.credentialKind } : {}),
    };
    await this.store.save(attempt);
    return attempt;
  }

  async start(attemptId: string): Promise<PublishingAttempt> {
    const attempt = await this.requireAttempt(attemptId);
    if (attempt.status === 'successful' || attempt.status === 'failed') {
      throw new PublishingAttemptStateError(
        'invalid_transition',
        `Cannot start attempt ${attemptId} because it is already ${attempt.status}.`,
      );
    }
    if (attempt.status === 'running') {
      return attempt;
    }
    const updated: PublishingAttempt = {
      ...attempt,
      status: 'running',
      startedAt: this.now().toISOString(),
    };
    await this.store.save(updated);
    return updated;
  }

  async begin(input: CreatePublishingAttemptInput): Promise<PublishingAttempt> {
    const attempt = await this.create(input);
    return this.start(attempt.attemptId);
  }

  async succeed(
    attemptId: string,
    input: SucceedPublishingAttemptInput = {},
  ): Promise<PublishingAttempt> {
    const attempt = await this.requireAttempt(attemptId);
    if (attempt.status === 'failed') {
      throw new PublishingAttemptStateError(
        'invalid_transition',
        `Cannot mark attempt ${attemptId} successful because it already failed.`,
      );
    }
    if (attempt.status === 'successful') {
      return attempt;
    }
    const updated: PublishingAttempt = {
      ...attempt,
      status: 'successful',
      completedAt: this.now().toISOString(),
      ...(attempt.startedAt ? {} : { startedAt: attempt.createdAt }),
      ...(input.validation ? { validation: input.validation } : {}),
      ...(input.artifact ? { artifact: input.artifact } : {}),
      ...(input.resultUrl ? { resultUrl: input.resultUrl } : {}),
      ...(input.reusedExisting ? { reusedExisting: true } : {}),
    };
    await this.store.save(updated);
    return updated;
  }

  async fail(attemptId: string, failure: PublishingAttemptFailure): Promise<PublishingAttempt> {
    const attempt = await this.requireAttempt(attemptId);
    if (attempt.status === 'successful') {
      throw new PublishingAttemptStateError(
        'invalid_transition',
        `Cannot mark attempt ${attemptId} failed because it already succeeded.`,
      );
    }
    const updated: PublishingAttempt = {
      ...attempt,
      status: 'failed',
      completedAt: attempt.completedAt ?? this.now().toISOString(),
      ...(attempt.startedAt ? {} : { startedAt: attempt.createdAt }),
      failure,
    };
    await this.store.save(updated);
    return updated;
  }

  async retry(
    attemptId: string,
    input: RetryPublishingAttemptInput = {},
  ): Promise<PublishingAttempt> {
    const original = await this.requireAttempt(attemptId);
    if (original.status !== 'failed') {
      throw new PublishingAttemptStateError(
        'invalid_transition',
        `Only failed attempts can be retried. Attempt ${attemptId} is ${original.status}.`,
      );
    }

    const idempotencyKey = input.idempotencyKey ?? original.idempotencyKey;
    const workflowRun = input.workflowRun ?? original.workflowRun;
    const source = input.source ?? original.source;
    const now = this.now().toISOString();
    const retry: PublishingAttempt = {
      attemptId: this.generateId(),
      libraryId: original.libraryId,
      kind: original.kind,
      status: 'running',
      attemptNumber: await this.nextAttemptNumber({
        libraryId: original.libraryId,
        kind: original.kind,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
      createdAt: now,
      startedAt: now,
      retryOf: original.attemptId,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(original.dryRun !== undefined ? { dryRun: original.dryRun } : {}),
      ...(workflowRun ? { workflowRun } : {}),
      ...(source ? { source } : {}),
      ...(original.publisher ? { publisher: original.publisher } : {}),
      ...(original.credentialKind ? { credentialKind: original.credentialKind } : {}),
    };
    await this.store.save(retry);
    return retry;
  }

  async findSuccessful(
    libraryId: string,
    kind: PublishingAttemptKind,
    idempotencyKey: string,
  ): Promise<PublishingAttempt | undefined> {
    return this.store.findSuccessful(libraryId, kind, idempotencyKey);
  }

  async latest(
    libraryId: string,
    kind?: PublishingAttemptKind,
  ): Promise<PublishingAttempt | undefined> {
    return this.store.latest(libraryId, kind);
  }

  private async requireAttempt(attemptId: string): Promise<PublishingAttempt> {
    const attempt = await this.store.get(attemptId);
    if (!attempt) {
      throw new PublishingAttemptStateError(
        'attempt_not_found',
        `Publishing attempt ${attemptId} was not found.`,
      );
    }
    return attempt;
  }

  private async nextAttemptNumber(input: {
    readonly libraryId: string;
    readonly kind: PublishingAttemptKind;
    readonly idempotencyKey?: string;
  }): Promise<number> {
    const existing = await this.store.list({
      libraryId: input.libraryId,
      kind: input.kind,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });
    if (!input.idempotencyKey) {
      return 1;
    }
    return existing.reduce((max, attempt) => Math.max(max, attempt.attemptNumber), 0) + 1;
  }
}
