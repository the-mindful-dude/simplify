import type { Command } from './index.js';
import { RegistryClient } from '@simplify-dev/registry';
import { info, warning, CliError } from '../cli.js';

export const addCommand: Command = {
  name: 'add',
  description: 'Add an asset from the registry to the current project.',
  options: [
    {
      name: 'version',
      type: 'string',
      description: 'Asset version to install (defaults to the latest registered version).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, json } = context;

    const assetId = args[0];
    if (!assetId) {
      throw new CliError(
        'Missing required argument: <assetId>. Usage: simplify add <assetId> [options]',
        'MISSING_ARGUMENT',
      );
    }

    const version = typeof options.version === 'string' ? options.version : undefined;
    const client = new RegistryClient();
    const asset = await client.getAsset(assetId, version);

    if (asset === null) {
      throw new CliError(
        `Asset not found: "${assetId}"${version === undefined ? '' : ` @${version}`}.`,
        'ASSET_NOT_FOUND',
      );
    }

    info(
      dryRun
        ? `[dry-run] Would add "${asset.id}"@${asset.version}.`
        : `Adding "${asset.id}"@${asset.version}...`,
      json,
    );

    if (dryRun) {
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    warning('Installation is delegated to the installation subsystem and is not yet wired.', json);
  },
};
