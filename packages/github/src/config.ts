import { GitHubIntegrationError } from './errors.js';

export interface GitHubAppConfig {
  readonly appId: number;
  readonly privateKey: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly webhookSecret: string;
  readonly appSlug?: string;
}

const requiredKeys = [
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_APP_WEBHOOK_SECRET',
] as const;

function readRequired(env: NodeJS.ProcessEnv, key: (typeof requiredKeys)[number]): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new GitHubIntegrationError(
      'config_missing',
      `GitHub App configuration is missing ${key}.`,
    );
  }
  return value;
}

export function loadGitHubAppConfig(env: NodeJS.ProcessEnv = process.env): GitHubAppConfig {
  const missing = requiredKeys.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new GitHubIntegrationError(
      'config_missing',
      `GitHub App configuration is incomplete: ${missing.join(', ')}.`,
    );
  }

  const rawAppId = readRequired(env, 'GITHUB_APP_ID');
  const appId = Number(rawAppId);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new GitHubIntegrationError(
      'config_invalid',
      'GITHUB_APP_ID must be a positive integer.',
    );
  }

  return {
    appId,
    privateKey: readRequired(env, 'GITHUB_APP_PRIVATE_KEY').replace(/\\n/g, '\n'),
    clientId: readRequired(env, 'GITHUB_APP_CLIENT_ID'),
    clientSecret: readRequired(env, 'GITHUB_APP_CLIENT_SECRET'),
    webhookSecret: readRequired(env, 'GITHUB_APP_WEBHOOK_SECRET'),
    ...(env.GITHUB_APP_SLUG?.trim() ? { appSlug: env.GITHUB_APP_SLUG.trim() } : {}),
  };
}
