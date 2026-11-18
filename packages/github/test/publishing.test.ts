import { describe, expect, it } from 'vitest';

import {
  InMemoryPublishingAttemptStore,
  InMemoryPublishingCredentialStore,
  InMemoryPublishingProvenanceStore,
  PublishingAttemptService,
  PublishingAuthenticationError,
  PublishingAuthService,
  readGitHubActionsContext,
  readPublishTokenScope,
  toPublishingCredentialScope,
} from '../src/index.js';
import type { PublishingRepository } from '../src/index.js';

const repository: PublishingRepository = {
  repositoryId: 'R_kgDO000000',
  owner: 'simplify-dev',
  name: 'agent-chat',
  url: 'https://github.com/simplify-dev/agent-chat',
};

const publisher = {
  publisher: 'octocat',
  type: 'user' as const,
  actor: 'octocat',
};

describe('GitHub Actions publishing context', () => {
  it('extracts workflow run metadata without exposing credentials', () => {
    const context = readGitHubActionsContext({
      GITHUB_RUN_ID: '42',
      GITHUB_RUN_ATTEMPT: '2',
      GITHUB_WORKFLOW: 'simplify.dev library',
      GITHUB_EVENT_NAME: 'push',
      GITHUB_REF: 'refs/tags/v1.2.0',
      GITHUB_SHA: 'abc123',
      GITHUB_ACTOR: 'octocat',
      GITHUB_REPOSITORY: 'octocat/hello-world',
      SIMPLIFY_PUBLISH_TOKEN: 'super-secret-token',
    });

    expect(context.publishTokenPresent).toBe(true);
    expect(context.workflowRun).toMatchObject({
      runId: '42',
      runAttempt: 2,
      workflow: 'simplify.dev library',
      eventName: 'push',
      ref: 'refs/tags/v1.2.0',
      commitSha: 'abc123',
      actor: 'octocat',
      repository: 'octocat/hello-world',
      url: 'https://github.com/octocat/hello-world/actions/runs/42/attempts/2',
    });
    expect(JSON.stringify(context)).not.toContain('super-secret-token');
  });

  it('derives branch context from branch refs', () => {
    const context = readGitHubActionsContext({
      GITHUB_REF: 'refs/heads/main',
      GITHUB_REPOSITORY: 'octocat/hello-world',
    });
    expect(context.branch).toBe('main');
    expect(context.workflowRun?.branch).toBe('main');
  });

  it('reads scoped publishing token configuration', () => {
    const scope = readPublishTokenScope({
      SIMPLIFY_PUBLISH_LIBRARY_ID: 'agent-chat',
      SIMPLIFY_PUBLISH_REPOSITORY: 'simplify-dev/agent-chat',
      SIMPLIFY_PUBLISHER: 'octocat',
    });
    expect(scope).toEqual({
      libraryId: 'agent-chat',
      repository: 'simplify-dev/agent-chat',
      publisher: 'octocat',
    });
    expect(toPublishingCredentialScope(scope)).toEqual({
      libraryIds: ['agent-chat'],
      repositories: ['simplify-dev/agent-chat'],
      publisher: 'octocat',
    });
  });
});

describe('publishing credential authentication', () => {
  it('authenticates a scoped publishing token and rejects revocation', async () => {
    const store = new InMemoryPublishingCredentialStore({
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      generateId: () => 'cred_1',
      generateToken: () => 'simp_pub_token',
    });
    const service = new PublishingAuthService({
      credentialStore: store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const issued = await store.issue({
      kind: 'simplify-publish-token',
      publisher,
      scopes: {
        libraryIds: ['agent-chat'],
        repositories: ['simplify-dev/agent-chat'],
        publisher: 'octocat',
      },
      expiresAt: '2027-01-01T00:00:00.000Z',
    });

    const context = await service.authenticatePublishToken({
      token: issued.token,
      request: { libraryId: 'agent-chat', repository },
      authorized: { libraryId: 'agent-chat', repository },
    });
    expect(context.credentialKind).toBe('simplify-publish-token');
    expect(context.verification).toBe('credential-store');
    expect(context.publisher.publisher).toBe('octocat');

    await store.revoke('cred_1');
    await expect(
      service.authenticatePublishToken({
        token: issued.token,
        request: { libraryId: 'agent-chat', repository },
      }),
    ).rejects.toMatchObject({ code: 'credential_revoked' });
  });

  it('rotates a credential and invalidates the previous token', async () => {
    const store = new InMemoryPublishingCredentialStore({
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      generateId: (() => {
        let next = 0;
        return () => `cred_${++next}`;
      })(),
      generateToken: (() => {
        let next = 0;
        return () => `simp_pub_token_${++next}`;
      })(),
    });
    const service = new PublishingAuthService({
      credentialStore: store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const issued = await store.issue({
      kind: 'simplify-publish-token',
      publisher,
      scopes: { libraryIds: ['agent-chat'], repositories: ['simplify-dev/agent-chat'] },
    });
    const rotated = await service.rotateCredential(issued.credential.credentialId);
    expect(rotated?.token).not.toBe(issued.token);
    expect(rotated?.credential.credentialId).toBe('cred_2');

    await expect(
      service.authenticatePublishToken({
        token: issued.token,
        request: { libraryId: 'agent-chat', repository },
      }),
    ).rejects.toMatchObject({ code: 'credential_revoked' });

    await expect(
      service.authenticatePublishToken({
        token: rotated!.token,
        request: { libraryId: 'agent-chat', repository },
      }),
    ).resolves.toMatchObject({ credentialId: 'cred_2' });
  });

  it('rejects a token scoped to another library or repository', async () => {
    const store = new InMemoryPublishingCredentialStore({
      generateId: () => 'cred_1',
      generateToken: () => 'simp_pub_token',
    });
    const service = new PublishingAuthService({ credentialStore: store });
    const issued = await store.issue({
      kind: 'simplify-publish-token',
      publisher,
      scopes: { libraryIds: ['other-library'], repositories: ['simplify-dev/other-repo'] },
    });

    await expect(
      service.authenticatePublishToken({
        token: issued.token,
        request: { libraryId: 'agent-chat', repository },
      }),
    ).rejects.toMatchObject({ code: 'scope_mismatch' });
  });

  it('requires a configured scope for unknown fallback tokens', async () => {
    const service = new PublishingAuthService();
    await expect(
      service.authenticatePublishToken({
        token: 'unknown-token',
        request: { libraryId: 'agent-chat', repository },
      }),
    ).rejects.toMatchObject({ code: 'credential_invalid' });
  });

  it('rejects expired installation tokens and repository mismatches', async () => {
    const service = new PublishingAuthService({
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.authenticateInstallationToken({
        token: { token: 'installation-token', expiresAt: '2025-01-01T00:00:00.000Z' },
        request: { libraryId: 'agent-chat', repository },
        authorized: { libraryId: 'agent-chat', repository },
        publisher,
      }),
    ).rejects.toBeInstanceOf(PublishingAuthenticationError);

    await expect(
      service.authenticateInstallationToken({
        token: { token: 'installation-token', expiresAt: '2027-01-01T00:00:00.000Z' },
        request: {
          libraryId: 'agent-chat',
          repository: { ...repository, name: 'other-repo' },
        },
        authorized: { libraryId: 'agent-chat', repository },
        publisher,
      }),
    ).rejects.toMatchObject({ code: 'repository_mismatch' });

    await expect(
      service.authenticateInstallationToken({
        token: { token: 'installation-token', expiresAt: '2027-01-01T00:00:00.000Z' },
        request: { libraryId: 'agent-chat', repository },
        authorized: { libraryId: 'agent-chat', repository },
        publisher,
      }),
    ).resolves.toMatchObject({
      credentialKind: 'github-app-installation-token',
      verification: 'github-app-installation-token',
    });
  });
});

describe('publishing attempt tracking', () => {
  it('tracks pending, running, successful, and failed states', async () => {
    const store = new InMemoryPublishingAttemptStore();
    const service = new PublishingAttemptService({
      store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      generateId: (() => {
        let next = 0;
        return () => `attempt_${++next}`;
      })(),
    });

    const pending = await service.create({
      libraryId: 'agent-chat',
      kind: 'validation',
      idempotencyKey: 'validation:1',
    });
    expect(pending.status).toBe('pending');

    const running = await service.start(pending.attemptId);
    expect(running.status).toBe('running');
    expect(running.startedAt).toBe('2026-01-01T00:00:00.000Z');

    const successful = await service.succeed(running.attemptId, {
      validation: { valid: true, issues: [] },
    });
    expect(successful.status).toBe('successful');
    expect(successful.completedAt).toBe('2026-01-01T00:00:00.000Z');

    const failedAttempt = await service.begin({
      libraryId: 'agent-chat',
      kind: 'build',
      idempotencyKey: 'build:1',
    });
    const failed = await service.fail(failedAttempt.attemptId, {
      code: 'BUILD_FAILED',
      message: 'Build failed.',
      details: 'missing manifest',
    });
    expect(failed.status).toBe('failed');
    expect(failed.failure).toEqual({
      code: 'BUILD_FAILED',
      message: 'Build failed.',
      details: 'missing manifest',
    });
  });

  it('retries only failed attempts and preserves attempt numbering', async () => {
    const store = new InMemoryPublishingAttemptStore();
    const service = new PublishingAttemptService({
      store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      generateId: (() => {
        let next = 0;
        return () => `attempt_${++next}`;
      })(),
    });

    const original = await service.begin({
      libraryId: 'agent-chat',
      kind: 'publish',
      idempotencyKey: 'publish:agent-chat:1.0.0:abc',
    });
    await service.fail(original.attemptId, { code: 'PUBLISH_FAILED', message: 'Network error.' });

    const retry = await service.retry(original.attemptId);
    expect(retry.attemptNumber).toBe(2);
    expect(retry.retryOf).toBe(original.attemptId);
    expect(retry.status).toBe('running');

    await expect(service.retry(retry.attemptId)).rejects.toMatchObject({
      code: 'invalid_transition',
    });

    await service.succeed(retry.attemptId);
    const reused = await service.findSuccessful(
      'agent-chat',
      'publish',
      'publish:agent-chat:1.0.0:abc',
    );
    expect(reused?.attemptId).toBe(retry.attemptId);
    expect(reused?.attemptNumber).toBe(2);
  });

  it('records publishing provenance for the authenticated publisher and repository', async () => {
    const store = new InMemoryPublishingProvenanceStore();
    await store.record({
      publicationId: 'attempt_1',
      libraryId: 'agent-chat',
      version: '1.0.0',
      repository,
      commitSha: 'abc123',
      tag: 'v1.0.0',
      publisher,
      credentialKind: 'github-app-installation-token',
      verification: 'github-app-installation-token',
      publishedAt: '2026-01-01T00:00:00.000Z',
      workflowRun: { runId: '42' },
    });

    const latest = await store.latestForLibrary('agent-chat');
    expect(latest?.publisher.publisher).toBe('octocat');
    expect(latest?.repository.repositoryId).toBe(repository.repositoryId);
    expect(latest?.version).toBe('1.0.0');
  });
});
