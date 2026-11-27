import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRequestHandler } from '../src/app.js';
import { main, parseSendArguments } from '../src/dev/send-webhook.js';

const secret = 'local-webhook-secret';
const envKeys = ['GITHUB_APP_WEBHOOK_SECRET', 'WEBHOOK_PUBLIC_URL', 'REGISTRY_API_PORT'] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of envKeys) {
    savedEnv[key] = process.env[key];
  }
});

afterEach(() => {
  for (const key of envKeys) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

async function withReceiver(
  receiverSecret: string,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const requestHandler = createRequestHandler({
    env: { GITHUB_APP_WEBHOOK_SECRET: receiverSecret },
  });
  const server: Server = createServer((request, response) => {
    void requestHandler(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await run(`http://127.0.0.1:${port}/webhooks/github`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('local signed webhook sender', () => {
  it('parses event, url and delivery arguments', () => {
    expect(
      parseSendArguments(['--event=repository', '--url', 'http://localhost/webhooks/github']),
    ).toEqual({
      event: 'repository',
      url: 'http://localhost/webhooks/github',
      help: false,
    });
    expect(parseSendArguments(['--', '--event', 'push', '--delivery', 'separator-1'])).toEqual({
      event: 'push',
      deliveryId: 'separator-1',
      help: false,
    });
  });

  it('delivers a signed fixture to a running receiver', async () => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = secret;
    await withReceiver(secret, async (url) => {
      const exitCode = await main([
        '--event',
        'push',
        '--url',
        url,
        '--delivery',
        'sender-success-1',
      ]);
      expect(exitCode).toBe(0);
    });
  });

  it('returns a failure code when the signature does not match the receiver', async () => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = 'wrong-secret';
    await withReceiver(secret, async (url) => {
      const exitCode = await main(['--event', 'push', '--url', url, '--delivery', 'sender-bad-1']);
      expect(exitCode).toBe(1);
    });
  });

  it('fails when the local secret is missing', async () => {
    delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    expect(await main(['--event', 'push'])).toBe(1);
  });

  it('supports help and rejects unknown arguments', async () => {
    expect(await main(['--help'])).toBe(0);
    expect(await main(['--unknown', 'value'])).toBe(1);
  });
});
