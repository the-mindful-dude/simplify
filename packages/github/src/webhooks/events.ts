import { GitHubIntegrationError } from '../errors.js';

export interface NormalizedGitHubWebhookEvent {
  readonly deliveryId: string;
  readonly event: string;
  readonly payload: unknown;
  readonly rawPayload: string;
}

export function parseGitHubWebhookEvent(
  rawPayload: string,
  headers: Record<string, string | string[] | undefined>,
): NormalizedGitHubWebhookEvent {
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const event = first(headers['x-github-event']);
  const deliveryId = first(headers['x-github-delivery']);

  if (!event || !deliveryId) {
    throw new GitHubIntegrationError(
      'payload_invalid',
      'GitHub webhook request is missing X-GitHub-Event or X-GitHub-Delivery.',
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    throw new GitHubIntegrationError(
      'payload_invalid',
      'GitHub webhook payload is not valid JSON.',
    );
  }

  return { deliveryId, event, payload, rawPayload };
}
