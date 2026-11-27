import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { computeWebhookSignature } from '@simplify-dev/github';
import type {
  InstallationLifecycleEvent,
  RepositoryLifecycleEvent,
  WebhookEventPort,
} from '@simplify-dev/github';
import { createRequestHandler, MAX_PAYLOAD_BYTES } from '../src/app.js';
import { buildSignedWebhookRequest, webhookFixture } from '../src/dev/local-signed-request.js';

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

const openServers: Server[] = [];

async function startTestServer(
  options: {
    env?: NodeJS.ProcessEnv;
    eventHandlers?: WebhookEventPort;
  } = {},
): Promise<number> {
  const requestHandler = createRequestHandler({
    env: options.env ?? { GITHUB_APP_WEBHOOK_SECRET: secret },
    ...(options.eventHandlers ? { eventHandlers: options.eventHandlers } : {}),
  });
  const server = createServer((request, response) => {
    void requestHandler(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  openServers.push(server);
  return (server.address() as AddressInfo).port;
}

interface SendOptions {
  readonly method: string;
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

interface TestResponse {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

function send(port: number, options: SendOptions): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const clientRequest = httpRequest(
      {
        host: '127.0.0.1',
        port,
        method: options.method,
        path: options.path,
        headers: options.headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        response.on('error', reject);
      },
    );
    clientRequest.on('error', reject);
    if (options.body !== undefined) {
      clientRequest.write(options.body);
    }
    clientRequest.end();
  });
}

function postWebhook(port: number, deliveryId: string, event: string, payload: unknown) {
  const signed = buildSignedWebhookRequest({ secret, event, payload, deliveryId });
  return send(port, {
    method: 'POST',
    path: '/webhooks/github',
    headers: signed.headers,
    body: signed.body,
  });
}

afterEach(async () => {
  while (openServers.length > 0) {
    const server = openServers.pop();
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
});

describe('registry-api HTTP boundary', () => {
  it('accepts a signed delivery with only the webhook secret configured', async () => {
    const port = await startTestServer({
      env: {
        GITHUB_APP_WEBHOOK_SECRET: secret,
        GITHUB_APP_ID: '',
        GITHUB_APP_PRIVATE_KEY: '',
        GITHUB_APP_CLIENT_ID: '',
        GITHUB_APP_CLIENT_SECRET: '',
      },
    });

    const response = await postWebhook(port, 'http-accept-1', 'push', webhookFixture('push'));

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      accepted: true,
      deliveryId: 'http-accept-1',
      event: 'push',
      status: 'processed',
    });
    expect(response.body).not.toContain(secret);
  });

  it('rejects a bad signature with 401 and a generic error body', async () => {
    const port = await startTestServer();
    const signed = buildSignedWebhookRequest({
      secret,
      event: 'push',
      payload: webhookFixture('push'),
      deliveryId: 'http-401-1',
    });

    const response = await send(port, {
      method: 'POST',
      path: '/webhooks/github',
      headers: { ...signed.headers, 'x-hub-signature-256': 'sha256=deadbeef' },
      body: signed.body,
    });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_signature' });
  });

  it('rejects invalid JSON with 400', async () => {
    const port = await startTestServer();
    const body = 'not-json';

    const response = await send(port, {
      method: 'POST',
      path: '/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': 'http-400-json-1',
        'x-hub-signature-256': computeWebhookSignature(secret, body),
      },
      body,
    });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_payload' });
  });

  it('responds 400 before tearing down an oversized request', async () => {
    const port = await startTestServer();
    const body = 'x'.repeat(MAX_PAYLOAD_BYTES + 1);

    const response = await send(port, {
      method: 'POST',
      path: '/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': 'http-400-large-1',
        'x-hub-signature-256': computeWebhookSignature(secret, body),
      },
      body,
    });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_payload' });
  });

  it('returns 500 when the webhook secret is not configured', async () => {
    const port = await startTestServer({ env: { PORT: '3002' } });

    const response = await postWebhook(port, 'http-500-1', 'push', webhookFixture('push'));

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: 'github_app_not_configured' });
  });

  it('reports a repeated delivery as duplicate', async () => {
    const port = await startTestServer();
    const payload = webhookFixture('push');

    const first = await postWebhook(port, 'http-duplicate-1', 'push', payload);
    const second = await postWebhook(port, 'http-duplicate-1', 'push', payload);

    expect(first.status).toBe(200);
    expect(JSON.parse(first.body)).toMatchObject({ status: 'processed' });
    expect(second.status).toBe(200);
    expect(JSON.parse(second.body)).toMatchObject({ status: 'duplicate' });
  });

  it('dispatches each supported event to the injected port', async () => {
    const eventHandlers = new RecordingEventPort();
    const port = await startTestServer({ eventHandlers });
    const events = [
      'push',
      'create',
      'release',
      'repository',
      'installation',
      'installation_repositories',
    ] as const;

    const responses = [];
    for (const event of events) {
      responses.push(await postWebhook(port, `http-event-${event}`, event, webhookFixture(event)));
    }

    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({ accepted: true, status: 'processed' });
    });

    const bodies = responses.map(
      (response) => JSON.parse(response.body) as Record<string, unknown>,
    );
    expect(bodies[0]).not.toHaveProperty('stableReleaseCandidate');
    expect(bodies[1]).toMatchObject({ stableReleaseCandidate: true, action: 'tag_created' });
    expect(bodies[2]).toMatchObject({ stableReleaseCandidate: true, action: 'release_published' });
    expect(bodies[3]).toMatchObject({ action: 'created' });
    expect(bodies[4]).toMatchObject({ action: 'created' });
    expect(bodies[5]).toMatchObject({ action: 'added' });

    expect(eventHandlers.repositoryEvents).toHaveLength(1);
    expect(eventHandlers.installationEvents).toHaveLength(2);
  });

  it('serves health checks and rejects unknown routes', async () => {
    const port = await startTestServer();

    const health = await send(port, { method: 'GET', path: '/healthz' });
    const missing = await send(port, { method: 'GET', path: '/unknown' });

    expect(health.status).toBe(200);
    expect(JSON.parse(health.body)).toEqual({ status: 'ok', service: 'registry-api' });
    expect(missing.status).toBe(404);
    expect(JSON.parse(missing.body)).toEqual({ error: 'not_found' });
  });
});
