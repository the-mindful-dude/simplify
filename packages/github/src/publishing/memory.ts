import { randomUUID } from 'node:crypto';

import type {
  IssuedPublishingCredential,
  IssuePublishingCredentialInput,
  PublishingAttempt,
  PublishingAttemptQuery,
  PublishingAttemptStore,
  PublishingCredentialRecord,
  PublishingCredentialStore,
  PublishingProvenanceRecord,
  PublishingProvenanceStore,
  RotatePublishingCredentialInput,
} from './types.js';
import { fingerprintPublishingToken, generatePublishingToken } from './tokens.js';

export interface InMemoryPublishingCredentialStoreOptions {
  readonly now?: () => Date;
  readonly generateId?: () => string;
  readonly generateToken?: () => string;
}

export class InMemoryPublishingCredentialStore implements PublishingCredentialStore {
  private readonly credentials = new Map<string, PublishingCredentialRecord>();
  private readonly now: () => Date;
  private readonly generateId: () => string;
  private readonly generateToken: () => string;

  constructor(options: InMemoryPublishingCredentialStoreOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? (() => `cred_${randomUUID()}`);
    this.generateToken = options.generateToken ?? generatePublishingToken;
  }

  async issue(input: IssuePublishingCredentialInput): Promise<IssuedPublishingCredential> {
    const token = this.generateToken();
    const credential: PublishingCredentialRecord = {
      credentialId: this.generateId(),
      kind: input.kind,
      publisher: input.publisher,
      scopes: input.scopes,
      fingerprint: fingerprintPublishingToken(token),
      issuedAt: this.now().toISOString(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };
    this.credentials.set(credential.credentialId, credential);
    return { credential, token };
  }

  async findById(credentialId: string): Promise<PublishingCredentialRecord | undefined> {
    return this.credentials.get(credentialId);
  }

  async findByFingerprint(fingerprint: string): Promise<PublishingCredentialRecord | undefined> {
    return [...this.credentials.values()].find(
      (credential) => credential.fingerprint === fingerprint,
    );
  }

  async list(): Promise<readonly PublishingCredentialRecord[]> {
    return [...this.credentials.values()];
  }

  async revoke(
    credentialId: string,
    revokedAt?: string,
  ): Promise<PublishingCredentialRecord | undefined> {
    const existing = this.credentials.get(credentialId);
    if (!existing) {
      return undefined;
    }
    if (existing.revokedAt) {
      return existing;
    }
    const revoked: PublishingCredentialRecord = {
      ...existing,
      revokedAt: revokedAt ?? this.now().toISOString(),
    };
    this.credentials.set(credentialId, revoked);
    return revoked;
  }

  async rotate(
    credentialId: string,
    input: RotatePublishingCredentialInput = {},
  ): Promise<IssuedPublishingCredential | undefined> {
    const existing = this.credentials.get(credentialId);
    if (!existing || existing.revokedAt) {
      return undefined;
    }

    const token = this.generateToken();
    const expiresAt = input.expiresAt ?? existing.expiresAt;
    const metadata = input.metadata ?? existing.metadata;
    const replacement: PublishingCredentialRecord = {
      credentialId: this.generateId(),
      kind: existing.kind,
      publisher: existing.publisher,
      scopes: existing.scopes,
      fingerprint: fingerprintPublishingToken(token),
      issuedAt: this.now().toISOString(),
      ...(expiresAt ? { expiresAt } : {}),
      ...(metadata ? { metadata } : {}),
    };

    const rotatedAt = this.now().toISOString();
    this.credentials.set(credentialId, {
      ...existing,
      revokedAt: existing.revokedAt ?? rotatedAt,
      rotatedAt,
      replacedBy: replacement.credentialId,
    });
    this.credentials.set(replacement.credentialId, replacement);

    return { credential: replacement, token };
  }

  clear(): void {
    this.credentials.clear();
  }
}

export class InMemoryPublishingAttemptStore implements PublishingAttemptStore {
  private readonly attempts = new Map<string, PublishingAttempt>();

  async save(attempt: PublishingAttempt): Promise<void> {
    this.attempts.set(attempt.attemptId, attempt);
  }

  async get(attemptId: string): Promise<PublishingAttempt | undefined> {
    return this.attempts.get(attemptId);
  }

  async list(query: PublishingAttemptQuery = {}): Promise<readonly PublishingAttempt[]> {
    const results = [...this.attempts.values()]
      .filter((attempt) => {
        if (query.libraryId !== undefined && attempt.libraryId !== query.libraryId) {
          return false;
        }
        if (query.kind !== undefined && attempt.kind !== query.kind) {
          return false;
        }
        if (query.status !== undefined && attempt.status !== query.status) {
          return false;
        }
        if (query.idempotencyKey !== undefined && attempt.idempotencyKey !== query.idempotencyKey) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
        if (byCreatedAt !== 0) {
          return byCreatedAt;
        }
        return right.attemptNumber - left.attemptNumber;
      });

    return query.limit !== undefined ? results.slice(0, query.limit) : results;
  }

  async latest(
    libraryId: string,
    kind?: PublishingAttempt['kind'],
  ): Promise<PublishingAttempt | undefined> {
    const results = await this.list({
      libraryId,
      ...(kind ? { kind } : {}),
      limit: 1,
    });
    return results[0];
  }

  async findSuccessful(
    libraryId: string,
    kind: PublishingAttempt['kind'],
    idempotencyKey: string,
  ): Promise<PublishingAttempt | undefined> {
    const results = await this.list({
      libraryId,
      kind,
      status: 'successful',
      idempotencyKey,
      limit: 1,
    });
    return results[0];
  }

  clear(): void {
    this.attempts.clear();
  }
}

export class InMemoryPublishingProvenanceStore implements PublishingProvenanceStore {
  private readonly records = new Map<string, PublishingProvenanceRecord>();

  async record(record: PublishingProvenanceRecord): Promise<void> {
    this.records.set(record.publicationId, record);
  }

  async list(libraryId?: string): Promise<readonly PublishingProvenanceRecord[]> {
    return [...this.records.values()]
      .filter((record) => libraryId === undefined || record.libraryId === libraryId)
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  }

  async latestForLibrary(libraryId: string): Promise<PublishingProvenanceRecord | undefined> {
    const records = await this.list(libraryId);
    return records[0];
  }

  clear(): void {
    this.records.clear();
  }
}
