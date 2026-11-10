import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { loadGitHubAppConfig } from '../src/config.js';
import { GitHubIntegrationError } from '../src/errors.js';
import {
  computeWebhookSignature,
  createGitHubWebhookHandler,
  GitHubConnectionService,
  InMemoryWebhookDeliveryStore,
  RepositoryMetadataService,
  verifyWebhookSignature,
} from '../src/index.js';
import { InMemoryRepositoryLinkStore } from '../src/memory.js';
import type {
  GitHubAppClient,
  GitHubRepositorySummary,
  RepositoryLink,
  RepositoryLinkStore,
} from '../src/ports.js';

class FakeAppClient implements GitHubAppClient {
  private repositories = new Map<string, GitHubRepositorySummary>();
  private commits = new Map<string, string>();

  addRepository(summary: GitHubRepositorySummary): void {
    this.repositories.set(`${summary.owner}/${summary.name}`, summary);
  }

  setCommit(owner: string, name: string, branch: string, sha: string): void {
    this.commits.set(`${owner}/${name}/${branch}`, sha);
  }

  async createInstallationToken(): Promise<{ token: string; expiresAt: string }> {
    return {
      token: 'installation-token',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async getInstallation(): Promise<{
    installationId: number;
    account: string;
    suspended: boolean;
  }> {
    return { installationId: 1, account: 'simplify-dev', suspended: false };
  }

  async listInstallationRepositories(): Promise<GitHubRepositorySummary[]> {
    return [...this.repositories.values()];
  }

  async getRepository(
    _installationId: number,
    owner: string,
    name: string,
  ): Promise<GitHubRepositorySummary> {
    const repository = this.repositories.get(`${owner}/${name}`);
    if (!repository) {
      throw new GitHubIntegrationError(
        'repository_not_found',
        `Repository ${owner}/${name} is not available in the fake client.`,
      );
    }
    return repository;
  }

  async getLatestCommitSha(
    _installationId: number,
    owner: string,
    name: string,
    branch: string,
  ): Promise<string> {
    const sha = this.commits.get(`${owner}/${name}/${branch}`);
    if (!sha) {
      throw new GitHubIntegrationError(
        'repository_not_found',
        `Commit for ${owner}/${name}@${branch} is not available in the fake client.`,
      );
    }
    return sha;
  }

  async getAuthenticatedUser(): Promise<{
    login: string;
    id: number;
    name?: string;
  }> {
    return { login: 'simplify-dev', id: 1 };
  }
}

class TestRepositoryLinkStore implements RepositoryLinkStore {
  private links = new Map<string, RepositoryLink>();

  async findByRepositoryId(repositoryId: string): Promise<RepositoryLink | undefined> {
    return this.links.get(repositoryId);
  }

  async findByLibraryId(libraryId: string): Promise<RepositoryLink | undefined> {
    return [...this.links.values()].find((link) => link.libraryId === libraryId);
  }

  async list(): Promise<readonly RepositoryLink[]> {
    return [...this.links.values()];
  }

  async save(link: RepositoryLink): Promise<void> {
    this.links.set(link.repositoryId, link);
  }

  async delete(repositoryId: string): Promise<void> {
    this.links.delete(repositoryId);
  }
}

function makeRepository(
  summaryOverrides?: Partial<GitHubRepositorySummary>,
): GitHubRepositorySummary {
  return {
    repositoryId: 'R_kgDO000000',
    owner: 'simplify-dev',
    name: 'agent-chat',
    fullName: 'simplify-dev/agent-chat',
    url: 'https://github.com/simplify-dev/agent-chat',
    defaultBranch: 'main',
    visibility: 'public',
    ...summaryOverrides,
  };
}

function linkFor(repository: GitHubRepositorySummary, libraryId: string): RepositoryLink {
  return {
    repositoryId: repository.repositoryId,
    owner: repository.owner,
    name: repository.name,
    url: repository.url,
    defaultBranch: repository.defaultBranch,
    visibility: repository.visibility,
    libraryId,
    linkedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
  };
}

describe('GitHub App configuration', () => {
  it('loads a valid configuration from environment variables', () => {
    const config = loadGitHubAppConfig({
      GITHUB_APP_ID: '123456',
      GITHUB_APP_PRIVATE_KEY:
        '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n',
      GITHUB_APP_CLIENT_ID: 'client-id',
      GITHUB_APP_CLIENT_SECRET: 'client-secret',
      GITHUB_APP_WEBHOOK_SECRET: 'webhook-secret',
    });
    expect(config.appId).toBe(123456);
    expect(config.webhookSecret).toBe('webhook-secret');
  });

  it('rejects incomplete configuration', () => {
    expect(() =>
      loadGitHubAppConfig({
        GITHUB_APP_ID: '123456',
        GITHUB_APP_PRIVATE_KEY: 'key',
        GITHUB_APP_CLIENT_ID: 'client-id',
        GITHUB_APP_CLIENT_SECRET: 'secret',
      }),
    ).toThrow(GitHubIntegrationError);
  });

  it('rejects an invalid app id', () => {
    expect(() =>
      loadGitHubAppConfig({
        GITHUB_APP_ID: 'not-a-number',
        GITHUB_APP_PRIVATE_KEY: 'key',
        GITHUB_APP_CLIENT_ID: 'client-id',
        GITHUB_APP_CLIENT_SECRET: 'secret',
        GITHUB_APP_WEBHOOK_SECRET: 'secret',
      }),
    ).toThrow(GitHubIntegrationError);
  });
});

describe('webhook signature verification', () => {
  const secret = 'webhook-secret';
  const payload = '{"ref":"refs/heads/main"}';

  it('verifies a valid signature', () => {
    const signature = computeWebhookSignature(secret, payload);
    expect(verifyWebhookSignature(secret, payload, signature)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(verifyWebhookSignature(secret, payload, 'sha256=invalid')).toBe(false);
    expect(verifyWebhookSignature(secret, payload, undefined)).toBe(false);
  });
});

describe('repository connections', () => {
  it('links a repository to a library', async () => {
    const appClient = new FakeAppClient();
    const repository = makeRepository();
    appClient.addRepository(repository);
    const store = new TestRepositoryLinkStore();
    const service = new GitHubConnectionService({ appClient, repositoryStore: store });

    const link = await service.linkRepository({ repository, libraryId: 'agent-chat' });
    expect(link.libraryId).toBe('agent-chat');
    expect(await service.getLibraryRepository('agent-chat')).toEqual(link);
  });

  it('rejects linking one repository to two libraries', async () => {
    const appClient = new FakeAppClient();
    const repository = makeRepository();
    appClient.addRepository(repository);
    const store = new TestRepositoryLinkStore();
    const service = new GitHubConnectionService({ appClient, repositoryStore: store });

    await service.linkRepository({ repository, libraryId: 'agent-chat' });
    await expect(
      service.linkRepository({ repository, libraryId: 'other-library' }),
    ).rejects.toMatchObject({ code: 'repository_already_linked' });
  });

  it('rejects linking one library to two repositories', async () => {
    const appClient = new FakeAppClient();
    const store = new TestRepositoryLinkStore();
    const service = new GitHubConnectionService({ appClient, repositoryStore: store });

    await service.linkRepository({
      repository: makeRepository({ name: 'repo-a' }),
      libraryId: 'agent-chat',
    });
    await expect(
      service.linkRepository({
        repository: makeRepository({ name: 'repo-b', repositoryId: 'R_kgDO000001' }),
        libraryId: 'agent-chat',
      }),
    ).rejects.toMatchObject({ code: 'library_already_linked' });
  });

  it('disconnects a repository', async () => {
    const appClient = new FakeAppClient();
    const repository = makeRepository();
    appClient.addRepository(repository);
    const store = new TestRepositoryLinkStore();
    const service = new GitHubConnectionService({ appClient, repositoryStore: store });

    await service.linkRepository({ repository, libraryId: 'agent-chat' });
    await service.disconnectRepository(repository.repositoryId);
    expect(await service.getLibraryRepository('agent-chat')).toBeUndefined();
  });
});

describe('repository metadata synchronization', () => {
  it('synchronizes repository metadata and latest commit', async () => {
    const appClient = new FakeAppClient();
    const repository = makeRepository();
    appClient.addRepository(repository);
    appClient.setCommit(repository.owner, repository.name, repository.defaultBranch, 'abc123');
    const store = new TestRepositoryLinkStore();
    await store.save(linkFor(repository, 'agent-chat'));
    const service = new RepositoryMetadataService({ appClient, repositoryStore: store });

    const updated = await service.synchronize(1, repository.repositoryId);
    expect(updated.latestCommitSha).toBe('abc123');
    expect(updated.status).toBe('active');
    expect(updated.metadataUpdatedAt).toBeDefined();
  });

  it('marks a repository unavailable without changing published history', async () => {
    const store = new TestRepositoryLinkStore();
    const repository = makeRepository();
    await store.save(linkFor(repository, 'agent-chat'));
    const service = new RepositoryMetadataService({
      appClient: new FakeAppClient(),
      repositoryStore: store,
    });

    const updated = await service.markUnavailable(repository.repositoryId, 'inaccessible');
    expect(updated?.status).toBe('inaccessible');
    expect(updated?.libraryId).toBe('agent-chat');
  });
});

describe('webhook handler', () => {
  const secret = 'webhook-secret';
  const deliveryStore = new InMemoryWebhookDeliveryStore();
  const { handle } = createGitHubWebhookHandler({ secret, deliveryStore });

  function signatureFor(payload: string): string {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  function headers(event: string, deliveryId: string, signature: string) {
    return {
      'x-github-event': event,
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': signature,
    } as Record<string, string | string[] | undefined>;
  }

  it('processes a push without creating a stable release', async () => {
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: { full_name: 'simplify-dev/agent-chat' },
    });
    const result = await handle(payload, headers('push', 'delivery-push-1', signatureFor(payload)));
    expect(result.status).toBe('processed');
    expect(result.stableReleaseCandidate).toBe(false);
  });

  it('marks a tag creation as a stable release candidate', async () => {
    const payload = JSON.stringify({
      ref_type: 'tag',
      ref: 'refs/tags/v1.0.0',
      repository: { full_name: 'simplify-dev/agent-chat' },
    });
    const result = await handle(
      payload,
      headers('create', 'delivery-create-1', signatureFor(payload)),
    );
    expect(result.status).toBe('processed');
    expect(result.stableReleaseCandidate).toBe(true);
    expect(result.action).toBe('tag_created');
  });

  it('rejects duplicate deliveries idempotently', async () => {
    const payload = JSON.stringify({ ref: 'refs/heads/main' });
    const signature = signatureFor(payload);
    const first = await handle(payload, headers('push', 'delivery-dup-1', signature));
    const second = await handle(payload, headers('push', 'delivery-dup-1', signature));
    expect(first.status).toBe('processed');
    expect(second.status).toBe('duplicate');
  });

  it('rejects invalid signatures', async () => {
    const payload = JSON.stringify({ ref: 'refs/heads/main' });
    await expect(
      handle(payload, headers('push', 'delivery-bad-sig-1', 'sha256=invalid')),
    ).rejects.toHaveProperty('message', 'signature_invalid');
  });

  it('rejects missing event headers', async () => {
    const payload = '{}';
    await expect(
      handle(payload, {
        'x-github-delivery': 'delivery-missing-1',
        'x-hub-signature-256': signatureFor(payload),
      } as Record<string, string | string[] | undefined>),
    ).rejects.toHaveProperty('message', 'payload_invalid');
  });

  it('rejects invalid JSON payloads', async () => {
    await expect(
      handle('not-json', headers('push', 'delivery-bad-json-1', signatureFor('not-json'))),
    ).rejects.toHaveProperty('message', 'payload_invalid');
  });
});
