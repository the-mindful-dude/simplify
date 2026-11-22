import { GitHubIntegrationError } from '../errors.js';

/** Only the secret required to authenticate inbound webhook deliveries. */
export interface WebhookReceiverConfig {
  readonly webhookSecret: string;
}

/**
 * Loads only the secret needed to verify signed webhook deliveries.
 *
 * This deliberately does not require App credentials so a local receiver can
 * accept signed fixture events. Authenticated API actions must use
 * {@link loadGitHubAppConfig} instead.
 */
export function loadWebhookReceiverConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebhookReceiverConfig {
  const webhookSecret = env.GITHUB_APP_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new GitHubIntegrationError(
      'config_missing',
      'GitHub webhook configuration is missing GITHUB_APP_WEBHOOK_SECRET.',
    );
  }
  return { webhookSecret };
}
