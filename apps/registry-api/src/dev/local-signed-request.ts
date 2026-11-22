import { randomUUID } from 'node:crypto';

import { computeWebhookSignature, GitHubIntegrationError } from '@simplify-dev/github';

/**
 * Local development helper for signing fixture deliveries.
 *
 * This is a dev/test artifact of the registry API, not part of the published
 * `@simplify-dev/github` API or the webhook receiver runtime. Signing reuses the
 * package's `computeWebhookSignature` rather than reimplementing HMAC.
 */

/** A body and the headers needed to deliver it to a GitHub webhook receiver. */
export interface SignedWebhookRequest {
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface BuildSignedWebhookRequestInput {
  readonly secret: string;
  readonly event: string;
  readonly payload: unknown;
  readonly deliveryId?: string;
}

/**
 * Signs an event payload with a local secret for credential-free development.
 *
 * A fresh delivery id is generated unless one is supplied, so repeated sends
 * of the same fixture are treated as distinct deliveries by the receiver.
 */
export function buildSignedWebhookRequest(
  input: BuildSignedWebhookRequestInput,
): SignedWebhookRequest {
  if (!input.secret.trim()) {
    throw new GitHubIntegrationError(
      'config_missing',
      'A local webhook secret is required to sign a request.',
    );
  }
  if (!input.event.trim()) {
    throw new GitHubIntegrationError('payload_invalid', 'A webhook event name is required.');
  }

  const body = JSON.stringify(input.payload);
  const deliveryId = input.deliveryId?.trim() || randomUUID();

  return {
    body,
    headers: {
      'content-type': 'application/json',
      'x-github-event': input.event,
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': computeWebhookSignature(input.secret, body),
    },
  };
}

/** Small, deterministic payloads for exercising each supported local event. */
export function webhookFixture(event: string): Record<string, unknown> {
  const repository = {
    id: 1,
    name: 'example',
    full_name: 'simplify-dev/example',
    owner: { login: 'simplify-dev' },
    default_branch: 'main',
    html_url: 'https://github.com/simplify-dev/example',
  };

  switch (event) {
    case 'push':
      return { ref: 'refs/heads/main', repository };
    case 'create':
      return { ref_type: 'tag', ref: 'refs/tags/v0.0.1', repository };
    case 'release':
      return { action: 'published', release: { tag_name: 'v0.0.1' }, repository };
    case 'installation':
      return {
        action: 'created',
        installation: { id: 1, account: { login: 'simplify-dev' } },
        repositories: [repository],
      };
    case 'installation_repositories':
      return {
        action: 'added',
        installation: { id: 1, account: { login: 'simplify-dev' } },
        repositories_added: [repository],
      };
    case 'repository':
    default:
      return { action: 'created', installation: { id: 1 }, repository };
  }
}
