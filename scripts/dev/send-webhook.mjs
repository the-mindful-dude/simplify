import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Thin entry point only: all signing logic lives in the registry-api dev module.
// WEBHOOK_SENDER_MODULE (from .env.local) may override the default path.
const here = dirname(fileURLToPath(import.meta.url));
const modulePath = process.env.WEBHOOK_SENDER_MODULE
  ? resolve(process.env.WEBHOOK_SENDER_MODULE)
  : resolve(here, '../../apps/registry-api/dist/dev/send-webhook.js');

try {
  await access(modulePath);
} catch {
  console.error(
    'Local webhook sender is not available yet.\n' +
      `Expected module: ${modulePath}\n` +
      'Source: apps/registry-api/src/dev/send-webhook.ts\n' +
      'Build it with: pnpm --filter @simplify-dev/registry-api build',
  );
  process.exit(1);
}

const sender = await import(pathToFileURL(modulePath).href);
if (typeof sender.main !== 'function') {
  console.error(`${modulePath} must export main(argv: string[]): Promise<number>.`);
  process.exit(1);
}

const exitCode = await sender.main(process.argv.slice(2));
process.exitCode = typeof exitCode === 'number' ? exitCode : 0;
