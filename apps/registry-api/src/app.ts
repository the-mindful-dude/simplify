import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  createGitHubWebhookHandler,
  GitHubIntegrationError,
  InMemoryWebhookDeliveryStore,
  loadWebhookReceiverConfig,
} from '@simplify-dev/github';
import type { WebhookDeliveryStore, WebhookEventPort } from '@simplify-dev/github';

export const MAX_PAYLOAD_BYTES = 1_000_000;

export interface CreateRequestHandlerOptions {
  /** Defaults to `process.env`; injectable so the webhook-only path is testable. */
  readonly env?: NodeJS.ProcessEnv;
  readonly deliveryStore?: WebhookDeliveryStore;
  readonly eventHandlers?: WebhookEventPort;
}

interface ErrorMapping {
  readonly status: number;
  readonly error: string;
  readonly payloadTooLarge: boolean;
}

function mapError(error: unknown): ErrorMapping {
  if (error instanceof GitHubIntegrationError) {
    switch (error.code) {
      case 'signature_invalid':
        return { status: 401, error: 'invalid_signature', payloadTooLarge: false };
      case 'payload_invalid':
        return { status: 400, error: 'invalid_payload', payloadTooLarge: false };
      case 'payload_too_large':
        return { status: 400, error: 'invalid_payload', payloadTooLarge: true };
      case 'config_missing':
        return { status: 500, error: 'github_app_not_configured', payloadTooLarge: false };
      default:
        return { status: 500, error: 'internal_error', payloadTooLarge: false };
    }
  }
  return { status: 500, error: 'internal_error', payloadTooLarge: false };
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  closeConnection = false,
): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...(closeConnection ? { Connection: 'close' } : {}),
  });
  response.end(payload);
}

function collectBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let overflowed = false;

    request.on('data', (chunk: Buffer) => {
      if (overflowed) {
        return;
      }
      length += chunk.length;
      if (length > MAX_PAYLOAD_BYTES) {
        overflowed = true;
        // Stop buffering but keep the socket writable so the 400 can be sent.
        request.pause();
        reject(
          new GitHubIntegrationError(
            'payload_too_large',
            `Webhook payload exceeds the ${MAX_PAYLOAD_BYTES} byte limit.`,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!overflowed) {
        resolve(Buffer.concat(chunks));
      }
    });
    request.on('error', (error: unknown) => {
      if (!overflowed) {
        reject(error);
      }
    });
  });
}

/**
 * Builds the HTTP request handler for the registry API.
 *
 * Webhook ingestion intentionally depends only on the webhook secret; full
 * GitHub App credentials are still required by `loadGitHubAppConfig` for any
 * authenticated API action.
 */
export function createRequestHandler(options: CreateRequestHandlerOptions = {}) {
  const env = options.env ?? process.env;
  const deliveryStore = options.deliveryStore ?? new InMemoryWebhookDeliveryStore();
  let handler: ReturnType<typeof createGitHubWebhookHandler> | undefined;

  function resolveHandler() {
    if (!handler) {
      const config = loadWebhookReceiverConfig(env);
      handler = createGitHubWebhookHandler({
        secret: config.webhookSecret,
        deliveryStore,
        ...(options.eventHandlers ? { eventHandlers: options.eventHandlers } : {}),
      });
    }
    return handler;
  }

  return async function requestHandler(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const { url } = request;

    if (url === '/healthz' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok', service: 'registry-api' });
      return;
    }

    if (url === '/webhooks/github' && request.method === 'POST') {
      try {
        const body = await collectBody(request);
        const result = await resolveHandler().handle(
          body.toString('utf8'),
          request.headers as Record<string, string | string[] | undefined>,
        );
        sendJson(response, 200, {
          accepted: true,
          deliveryId: result.deliveryId,
          event: result.event,
          status: result.status,
          ...(result.stableReleaseCandidate ? { stableReleaseCandidate: true } : {}),
          ...(result.action ? { action: result.action } : {}),
        });
        return;
      } catch (error) {
        const mapping = mapError(error);
        sendJson(response, mapping.status, { error: mapping.error }, mapping.payloadTooLarge);
        if (mapping.payloadTooLarge) {
          // Tear down only after the response has been flushed to the socket.
          response.once('finish', () => request.destroy());
        }
        return;
      }
    }

    sendJson(response, 404, { error: 'not_found' });
  };
}
