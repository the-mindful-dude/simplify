import { describe, expect, it } from 'vitest';

import {
  computeWebhookSignature,
  createGitHubWebhookHandler,
  GitHubIntegrationError,
  InMemoryRepositoryLinkStore,
  InMemoryWebhookDeliveryStore,
  loadGitHubWebhookConfig,
  loadWebhookReceiverConfig,
  verifyWebhookSignature,
} from '../src/index.js';
import type {
  InstallationLifecycleEvent,
  RepositoryLifecycleEvent,
  RepositoryLink,
  WebhookEventPort,
} from '../src/index.js';

const secret = 'local-webhook-secret';

class RecordingEventPort implements WebhookEventPort {
  readonly repositoryEvents: RepositoryLifecycleEvent[] = [];
  readonly installationEvents: InstallationLifecycleEvent[] = [];

  async onRepositoryLifecycle(event: RepositoryLifecycleEvent): Promise<void> {
    this.repositoryEvents.push(event);
  }

  async onInstallationLifecycle(event: InstallationLifecycleEvent): Promise<void> {
    this.installationEvents.push(event);
  }
}

function headers(
  event: string,
  deliveryId: string,
  body: string,
): Record<string, string | string[] | undefined> {
  return {
    'x-github-event': event,
    'x-github-delivery': deliveryId,
    'x-hub-signature-256': computeWebhookSignature(secret, body),
  };
}

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the function to throw');
}

function makeLink(overrides: Partial<RepositoryLink> = {}): RepositoryLink {
  return {
    repositoryId: '42',
    owner: 'simplify-dev',
    name: 'example',
    url: 'https://github.com/simplify-dev/example',
    defaultBranch: 'main',
    visibility: 'public',
    libraryId: 'example-library',
    linkedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

describe('webhook-only configuration', () => {
  it('loads with only the webhook secret', () => {
    expect(loadWebhookReceiverConfig({ GITHUB_APP_WEBHOOK_SECRET: 'local-secret' })).toEqual({
      webhookSecret: 'local-secret',
    });
  });

  it('rejects when the webhook secret is missing', () => {
    const error = captureError(() => loadWebhookReceiverConfig({ PORT: '3002' }));
    expect(error).toBeInstanceOf(GitHubIntegrationError);
    expect(error).toMatchObject({ code: 'config_missing' });
  });

  it('keeps the previous factory name as a backwards-compatible alias', () => {
    expect(loadGitHubWebhookConfig).toBe(loadWebhookReceiverConfig);
    expect(loadGitHubWebhookConfig({ GITHUB_APP_WEBHOOK_SECRET: 'legacy-secret' })).toEqual({
      webhookSecret: 'legacy-secret',
    });
  });
});

describe('atomic delivery claims', () => {
  it('grants exactly one of several concurrent claims for the same id', async () => {
    const store = new InMemoryWebhookDeliveryStore();
    const record = {
      deliveryId: 'store-claim-1',
      event: 'push',
      receivedAt: '2026-01-01T00:00:00.000Z',
      status: 'processed',
    } as const;

    const results = await Promise.all([
      store.claim(record),
      store.claim(record),
      store.claim(record),
    ]);
    expect(results.filter((claimed) => claimed)).toHaveLength(1);
    expect(await store.get(record.deliveryId)).toEqual(record);
  });

  it('processes only one of several concurrent duplicate deliveries', async () => {
    const { handle } = createGitHubWebhookHandler({
      secret,
      deliveryStore: new InMemoryWebhookDeliveryStore(),
    });
    const body = JSON.stringify({ ref: 'refs/heads/main' });
    const deliveryHeaders = headers('push', 'handler-claim-1', body);

    const results = await Promise.all([
      handle(body, deliveryHeaders),
      handle(body, deliveryHeaders),
      handle(body, deliveryHeaders),
    ]);
    expect(results.filter((result) => result.status === 'processed')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'duplicate')).toHaveLength(2);
  });
});

describe('webhook lifecycle dispatch', () => {
  function handlerWith(port: WebhookEventPort, deliveryStore = new InMemoryWebhookDeliveryStore()) {
    return createGitHubWebhookHandler({ secret, deliveryStore, eventHandlers: port });
  }

  it('dispatches a repository lifecycle event to the injected port', async () => {
    const port = new RecordingEventPort();
    const { handle } = handlerWith(port);
    const body = JSON.stringify({
      action: 'deleted',
      repository: { id: 42, full_name: 'simplify-dev/example' },
      installation: { id: 7 },
    });

    const result = await handle(body, headers('repository', 'repository-1', body));

    expect(result.status).toBe('processed');
    expect(result.action).toBe('deleted');
    expect(port.repositoryEvents).toEqual([
      {
        action: 'deleted',
        repositoryId: '42',
        fullName: 'simplify-dev/example',
        installationId: 7,
      },
    ]);
  });

  it('dispatches installation events', async () => {
    const port = new RecordingEventPort();
    const { handle } = handlerWith(port);
    const body = JSON.stringify({
      action: 'created',
      installation: { id: 9, account: { login: 'simplify-dev' } },
      repositories: [{ id: 11 }],
    });

    const result = await handle(body, headers('installation', 'installation-1', body));

    expect(result.status).toBe('processed');
    expect(result.action).toBe('created');
    expect(port.installationEvents).toEqual([
      {
        event: 'installation',
        action: 'created',
        installationId: 9,
        account: 'simplify-dev',
        repositoryIds: ['11'],
      },
    ]);
  });

  it('dispatches installation_repositories added and removed ids', async () => {
    const port = new RecordingEventPort();
    const { handle } = handlerWith(port);
    const body = JSON.stringify({
      action: 'added',
      installation: { id: 9 },
      repositories_added: [{ id: 11 }],
      repositories_removed: [{ id: 12 }],
    });

    await handle(body, headers('installation_repositories', 'installation-repos-1', body));

    expect(port.installationEvents).toEqual([
      {
        event: 'installation_repositories',
        action: 'added',
        installationId: 9,
        repositoryIds: ['11', '12'],
      },
    ]);
  });

  it('updates a linked repository through the default link-store port', async () => {
    const linkStore = new InMemoryRepositoryLinkStore();
    await linkStore.save(makeLink());
    const { handle } = createGitHubWebhookHandler({
      secret,
      deliveryStore: new InMemoryWebhookDeliveryStore(),
      repositoryLinkStore: linkStore,
    });
    const body = JSON.stringify({ action: 'deleted', repository: { id: 42 } });

    await handle(body, headers('repository', 'repository-link-1', body));

    expect((await linkStore.findByRepositoryId('42'))?.status).toBe('deleted');
  });

  it('marks a delivery failed when an event port throws', async () => {
    const deliveryStore = new InMemoryWebhookDeliveryStore();
    const failingPort: WebhookEventPort = {
      async onRepositoryLifecycle() {
        throw new Error('sink unavailable');
      },
    };
    const { handle } = handlerWith(failingPort, deliveryStore);
    const body = JSON.stringify({ action: 'created', repository: { id: 42 } });

    await expect(handle(body, headers('repository', 'repository-fail-1', body))).rejects.toThrow(
      'sink unavailable',
    );
    expect(await deliveryStore.get('repository-fail-1')).toMatchObject({ status: 'failed' });
  });
});
