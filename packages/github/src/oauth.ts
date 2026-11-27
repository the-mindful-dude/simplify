import { exchangeWebFlowCode, getWebFlowAuthorizationUrl } from '@octokit/oauth-methods';

import { GitHubIntegrationError } from './errors.js';

export interface AuthorizationUrlInput {
  readonly clientId: string;
  readonly redirectUrl: string;
  readonly state?: string;
}

export interface OAuthTokenSet {
  readonly token: string;
  readonly expiresAt?: string;
  readonly refreshToken?: string;
  readonly refreshTokenExpiresAt?: string;
}

export function buildGitHubAuthorizationUrl(input: AuthorizationUrlInput): string {
  return getWebFlowAuthorizationUrl({
    clientType: 'github-app',
    clientId: input.clientId,
    redirectUrl: input.redirectUrl,
    ...(input.state ? { state: input.state } : {}),
  }).url;
}

export async function exchangeGitHubAuthorizationCode(input: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUrl?: string;
}): Promise<OAuthTokenSet> {
  try {
    const { authentication } = await exchangeWebFlowCode({
      clientType: 'github-app',
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      code: input.code,
      ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
    });

    return {
      token: authentication.token,
      ...('expiresAt' in authentication && authentication.expiresAt
        ? { expiresAt: authentication.expiresAt }
        : {}),
      ...('refreshToken' in authentication && authentication.refreshToken
        ? { refreshToken: authentication.refreshToken }
        : {}),
      ...('refreshTokenExpiresAt' in authentication && authentication.refreshTokenExpiresAt
        ? { refreshTokenExpiresAt: authentication.refreshTokenExpiresAt }
        : {}),
    };
  } catch (error) {
    throw new GitHubIntegrationError(
      'auth_failed',
      'Could not exchange the GitHub authorization code.',
      { cause: error },
    );
  }
}
