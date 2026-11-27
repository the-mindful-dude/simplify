import { GitHubIntegrationError } from '../errors.js';
import type { RepositoryLinkStore, WebhookDeliveryStore, WebhookEventPort } from '../ports.js';
import {
  parseGitHubWebhookEvent,
  toInstallationLifecycleEvent,
  toRepositoryLifecycleEvent,
} from './events.js';
import type { NormalizedGitHubWebhookEvent } from './events.js';
import { createRepositoryLinkEventPort } from './repository-link-port.js';
import { verifyWebhookSignature } from './signature.js';

export interface GitHubWebhookHandlerOptions {
  readonly secret: string;
  readonly deliveryStore: WebhookDeliveryStore;
  readonly repositoryLinkStore?: RepositoryLinkStore;
  readonly eventHandlers?: WebhookEventPort;
}

export interface WebhookResult {
  readonly deliveryId: string;
  readonly event: string;
  readonly status: 'processed' | 'duplicate';
  readonly stableReleaseCandidate: boolean;
  readonly action?: string;
}

const stableReleaseEvents = new Set(['create', 'release']);

function readRefType(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>)['ref_type'];
  return typeof value === 'string' ? value : undefined;
}

export function createGitHubWebhookHandler(options: GitHubWebhookHandlerOptions) {
  const now = () => new Date().toISOString();
  const eventPort: WebhookEventPort | undefined =
    options.eventHandlers ??
    (options.repositoryLinkStore
      ? createRepositoryLinkEventPort(options.repositoryLinkStore)
      : undefined);

  async function handle(
    rawPayload: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookResult> {
    const first = (value: string | string[] | undefined): string | undefined =>
      Array.isArray(value) ? value[0] : value;

    const signature = first(headers['x-hub-signature-256']);
    if (!verifyWebhookSignature(options.secret, rawPayload, signature)) {
      throw new GitHubIntegrationError('signature_invalid', 'GitHub webhook signature is invalid.');
    }

    const normalized: NormalizedGitHubWebhookEvent = parseGitHubWebhookEvent(rawPayload, headers);
    const { deliveryId, event } = normalized;
    const receivedAt = now();

    const claimed = await options.deliveryStore.claim({
      deliveryId,
      event,
      receivedAt,
      status: 'processed',
    });
    if (!claimed) {
      return {
        deliveryId,
        event,
        status: 'duplicate',
        stableReleaseCandidate: false,
      };
    }

    let stableReleaseCandidate = false;
    let action: string | undefined;

    try {
      if (event === 'push') {
        // Ordinary pushes must never become stable releases. They may only
        // contribute to development snapshots through a separate sync pipeline.
        stableReleaseCandidate = false;
      } else if (stableReleaseEvents.has(event)) {
        stableReleaseCandidate = true;
        if (event === 'create' && readRefType(normalized.payload) === 'tag') {
          action = 'tag_created';
        } else if (event === 'release') {
          action = 'release_published';
        }
      } else if (event === 'repository') {
        const lifecycle = toRepositoryLifecycleEvent(normalized);
        action = lifecycle.action || undefined;
        await eventPort?.onRepositoryLifecycle?.(lifecycle);
      } else if (event === 'installation' || event === 'installation_repositories') {
        const lifecycle = toInstallationLifecycleEvent(normalized, event);
        action = lifecycle.action || undefined;
        await eventPort?.onInstallationLifecycle?.(lifecycle);
      }
    } catch (error) {
      await options.deliveryStore.record({
        deliveryId,
        event,
        receivedAt,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return {
      deliveryId,
      event,
      status: 'processed',
      stableReleaseCandidate,
      ...(action ? { action } : {}),
    };
  }

  return { handle };
}
