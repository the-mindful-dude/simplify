import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  createGitHubWebhookHandler,
  InMemoryWebhookDeliveryStore,
  loadGitHubAppConfig,
} from '@simplify-dev/github';
import type { GitHubIntegrationError } from '@simplify-dev/github';

const MAX_PAYLOAD_BYTES = 1_000_000;

let handler: ReturnType<typeof createGitHubWebhookHandler> | undefined;
const deliveryStore = new InMemoryWebhookDeliveryStore();

function getHandler() {
  if (!handler) {
    // GITHUB_APP_WEBHOOK_SECRET is loaded here so the service can start for health
    // checks even when full GitHub App credentials are not yet configured.
    const config = loadGitHubAppConfig(process.env);
    handler = createGitHubWebhookHandler({ secret: config.webhookSecret, deliveryStore });
  }
  return handler;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function collectBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    request.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > MAX_PAYLOAD_BYTES) {
        request.destroy();
        reject(new Error('payload_too_large'));
      }
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { url } = request;

  if (url === '/healthz' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok', service: 'registry-api' });
    return;
  }

  if (url === '/webhooks/github' && request.method === 'POST') {
    try {
      const body = await collectBody(request);
      const result = await getHandler().handle(
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
      if (error instanceof Error) {
        if (error.message === 'signature_invalid') {
          sendJson(response, 401, { error: 'invalid_signature' });
          return;
        }
        if (error.message === 'payload_invalid' || error.message === 'payload_too_large') {
          sendJson(response, 400, { error: 'invalid_payload' });
          return;
        }
        if ((error as GitHubIntegrationError).code === 'config_missing') {
          sendJson(response, 500, { error: 'github_app_not_configured' });
          return;
        }
      }
      sendJson(response, 500, { error: 'internal_error' });
      return;
    }
  }

  sendJson(response, 404, { error: 'not_found' });
}

const server = createServer(handleRequest);
const port = Number(process.env.PORT || 3002);

server.listen(port, process.env.HOSTNAME ?? '0.0.0.0', () => {
  console.log(`registry-api listening on ${process.env.HOSTNAME ?? '0.0.0.0'}:${port}`);
});

server.on('error', (error: unknown) => {
  console.error('registry-api server error', error);
  process.exit(1);
});
