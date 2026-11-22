import { buildSignedWebhookRequest, webhookFixture } from './local-signed-request.js';
import type { SignedWebhookRequest } from './local-signed-request.js';

interface SendArguments {
  readonly event: string;
  readonly help: boolean;
  readonly url?: string;
  readonly deliveryId?: string;
}

const usage = [
  'Usage: webhook:send -- [options]',
  '  --event <name>     GitHub event name (default: push).',
  '  --url <url>        Full webhook endpoint URL (default: local API or WEBHOOK_PUBLIC_URL).',
  '  --delivery <id>    Delivery id (default: a fresh random id).',
  '  --help             Show this message.',
  'Requires GITHUB_APP_WEBHOOK_SECRET; no GitHub App credentials are used.',
].join('\n');

function splitFlag(argument: string): [string, string | undefined] {
  const separator = argument.indexOf('=');
  return separator === -1
    ? [argument, undefined]
    : [argument.slice(0, separator), argument.slice(separator + 1)];
}

export function parseSendArguments(argv: readonly string[]): SendArguments {
  let event = 'push';
  let url: string | undefined;
  let deliveryId: string | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? '';
    if (argument === '--') {
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }

    const [flag, inlineValue] = splitFlag(argument);
    if (!flag.startsWith('--')) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    let value = inlineValue;
    if (value === undefined) {
      index += 1;
      value = argv[index];
    }
    if (value === undefined) {
      throw new Error(`Missing value for ${flag}`);
    }

    const key = flag.slice(2);
    if (key === 'event') {
      event = value;
    } else if (key === 'url') {
      url = value;
    } else if (key === 'delivery') {
      deliveryId = value;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }

  return {
    event,
    help,
    ...(url ? { url } : {}),
    ...(deliveryId ? { deliveryId } : {}),
  };
}

function resolveTargetUrl(explicit: string | undefined): string {
  if (explicit) {
    return explicit;
  }
  const publicBase = process.env.WEBHOOK_PUBLIC_URL?.trim();
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/webhooks/github`;
  }
  const port = process.env.REGISTRY_API_PORT?.trim() || '3002';
  return `http://localhost:${port}/webhooks/github`;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Entry point used by `scripts/dev/send-webhook.mjs`. */
export async function main(argv: readonly string[]): Promise<number> {
  let args: SendArguments;
  try {
    args = parseSendArguments(argv);
  } catch (error) {
    console.error(`Invalid arguments: ${describe(error)}`);
    console.error(usage);
    return 1;
  }

  if (args.help) {
    console.log(usage);
    return 0;
  }

  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('GITHUB_APP_WEBHOOK_SECRET is required to sign a local delivery.');
    return 1;
  }

  let signed: SignedWebhookRequest;
  try {
    signed = buildSignedWebhookRequest({
      secret,
      event: args.event,
      payload: webhookFixture(args.event),
      ...(args.deliveryId ? { deliveryId: args.deliveryId } : {}),
    });
  } catch (error) {
    console.error(`Could not build the signed request: ${describe(error)}`);
    return 1;
  }

  const url = resolveTargetUrl(args.url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...signed.headers },
      body: signed.body,
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.text();
    console.log(`POST ${url} -> ${response.status}`);
    console.log(body);
    return response.ok ? 0 : 1;
  } catch (error) {
    console.error(`Webhook delivery failed: ${describe(error)}`);
    return 1;
  }
}
