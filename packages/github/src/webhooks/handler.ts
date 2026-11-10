import type { NormalizedGitHubWebhookEvent } from './events.js';
import { verifyWebhookSignature } from './signature.js';
import type { RepositoryLinkStore, WebhookDeliveryStore } from '../ports.js';

export interface GitHubWebhookHandlerOptions {
  readonly secret: string;
  readonly deliveryStore: WebhookDeliveryStore;
  readonly repositoryLinkStore?: RepositoryLinkStore;
}

export interface WebhookResult {
  readonly deliveryId: string;
  readonly event: string;
  readonly status: 'processed' | 'duplicate';
  readonly stableReleaseCandidate: boolean;
  readonly action?: string;
}

const stableReleaseEvents = new Set(['create', 'release']);

export function createGitHubWebhookHandler(options: GitHubWebhookHandlerOptions) {
  const now = () => new Date().toISOString();

  async function handle(
    rawPayload: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookResult> {
    const first = (value: string | string[] | undefined): string | undefined =>
      Array.isArray(value) ? value[0] : value;

    const signature = first(headers['x-hub-signature-256']);
    if (!verifyWebhookSignature(options.secret, rawPayload, signature)) {
      throw new Error('signature_invalid');
    }

    const event = first(headers['x-github-event']);
    const deliveryId = first(headers['x-github-delivery']);
    if (!event || !deliveryId) {
      throw new Error('payload_invalid');
    }

    if (await options.deliveryStore.has(deliveryId)) {
      return {
        deliveryId,
        event,
        status: 'duplicate',
        stableReleaseCandidate: false,
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      throw new Error('payload_invalid');
    }

    const normalized: NormalizedGitHubWebhookEvent = {
      deliveryId,
      event,
      payload,
      rawPayload,
    };

    let stableReleaseCandidate = false;
    let action: string | undefined;

    if (event === 'push') {
      // Ordinary pushes must never become stable releases. They may only
      // contribute to development snapshots through a separate sync pipeline.
      stableReleaseCandidate = false;
    } else if (stableReleaseEvents.has(event)) {
      stableReleaseCandidate = true;
      if (event === 'create' && normalized.payload) {
        const ref = (normalized.payload as { readonly ref_type?: string; readonly ref?: string })
          .ref_type;
        if (ref === 'tag') {
          action = 'tag_created';
        }
      } else if (event === 'release') {
        action = 'release_published';
      }
    } else if (event === 'repository') {
      action = (normalized.payload as { readonly action?: string }).action;
      if (options.repositoryLinkStore && action) {
        // Repository lifecycle handling is delegated to the connection service;
        // the webhook handler only records that the event was observed.
      }
    } else if (event === 'installation' || event === 'installation_repositories') {
      action = (normalized.payload as { readonly action?: string }).action;
    }

    await options.deliveryStore.record({
      deliveryId,
      event,
      receivedAt: now(),
      status: 'processed',
    });

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
