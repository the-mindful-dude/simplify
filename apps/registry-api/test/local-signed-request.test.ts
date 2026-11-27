import { describe, expect, it } from 'vitest';

import { GitHubIntegrationError, verifyWebhookSignature } from '@simplify-dev/github';
import { buildSignedWebhookRequest, webhookFixture } from '../src/dev/local-signed-request.js';

const secret = 'local-webhook-secret';

describe('local signed request helper', () => {
  it('signs a fixture payload with fresh delivery ids', () => {
    const first = buildSignedWebhookRequest({
      secret,
      event: 'push',
      payload: webhookFixture('push'),
    });
    const second = buildSignedWebhookRequest({
      secret,
      event: 'push',
      payload: webhookFixture('push'),
    });

    expect(verifyWebhookSignature(secret, first.body, first.headers['x-hub-signature-256'])).toBe(
      true,
    );
    expect(first.headers['x-github-event']).toBe('push');
    expect(first.headers['x-github-delivery']).not.toBe(second.headers['x-github-delivery']);
    expect(JSON.parse(first.body)).toMatchObject({ ref: 'refs/heads/main' });
  });

  it('rejects an empty secret or event', () => {
    expect(() => buildSignedWebhookRequest({ secret: '', event: 'push', payload: {} })).toThrow(
      GitHubIntegrationError,
    );
    expect(() => buildSignedWebhookRequest({ secret, event: '', payload: {} })).toThrow(
      GitHubIntegrationError,
    );
  });
});
