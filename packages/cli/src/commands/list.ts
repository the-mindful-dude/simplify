import { readFile } from 'node:fs/promises';
import type { Command } from './index.js';
import { info, warning, CliError } from '../cli.js';

const LOCK_FILE = '.simplify/lock.json';

interface InstalledAsset {
  readonly assetId: string;
  readonly version: string;
  readonly installedAt: string;
}

interface SimplifyLock {
  readonly schemaVersion: number;
  readonly assets: readonly InstalledAsset[];
}

export const listCommand: Command = {
  name: 'list',
  description: 'List installed assets from .simplify/lock.json.',
  options: [],
  handler: async (context) => {
    const { json } = context;

    let lock: SimplifyLock;
    try {
      const raw = await readFile(LOCK_FILE, 'utf8');
      lock = JSON.parse(raw) as SimplifyLock;
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        warning('No .simplify/lock.json found. No assets installed.', json);
        return;
      }
      throw new CliError(`Failed to read ${LOCK_FILE}: ${nodeError.message}`, 'LOCK_READ_FAILED');
    }

    const assets = lock.assets ?? [];

    if (json) {
      console.log(JSON.stringify({ assets }, null, 2));
      return;
    }

    if (assets.length === 0) {
      info('No installed assets.', json);
      return;
    }

    info(`Installed assets (${assets.length}):`, json);
    for (const asset of assets) {
      info(`  - ${asset.assetId}@${asset.version}`, json);
    }
  },
};
