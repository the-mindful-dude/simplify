import { GitHubIntegrationError } from '../errors.js';
import type { InstallationLifecycleEvent, RepositoryLifecycleEvent } from '../ports.js';

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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readId(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

function collectRepositoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const id = record ? readId(record['id']) : undefined;
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

/** Extracts the port-facing shape of a `repository` lifecycle event. */
export function toRepositoryLifecycleEvent(
  event: NormalizedGitHubWebhookEvent,
): RepositoryLifecycleEvent {
  const root = asRecord(event.payload) ?? {};
  const repository = asRecord(root['repository']);
  const installation = asRecord(root['installation']);
  const repositoryId = repository ? readId(repository['id']) : undefined;
  const fullName = repository ? readString(repository['full_name']) : undefined;
  const installationId = installation ? readNumber(installation['id']) : undefined;

  return {
    action: readString(root['action']) ?? '',
    ...(repositoryId ? { repositoryId } : {}),
    ...(fullName ? { fullName } : {}),
    ...(installationId !== undefined ? { installationId } : {}),
  };
}

/** Extracts the port-facing shape of an `installation` lifecycle event. */
export function toInstallationLifecycleEvent(
  event: NormalizedGitHubWebhookEvent,
  eventName: 'installation' | 'installation_repositories',
): InstallationLifecycleEvent {
  const root = asRecord(event.payload) ?? {};
  const installation = asRecord(root['installation']);
  const account = installation ? asRecord(installation['account']) : undefined;
  const installationId = installation ? readNumber(installation['id']) : undefined;
  const accountLogin = account ? readString(account['login']) : undefined;

  return {
    event: eventName,
    action: readString(root['action']) ?? '',
    repositoryIds: [
      ...collectRepositoryIds(root['repositories']),
      ...collectRepositoryIds(root['repositories_added']),
      ...collectRepositoryIds(root['repositories_removed']),
    ],
    ...(installationId !== undefined ? { installationId } : {}),
    ...(accountLogin ? { account: accountLogin } : {}),
  };
}
