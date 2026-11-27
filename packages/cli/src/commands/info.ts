import type { Command } from './index.js';
import { RegistryClient } from '@simplify-dev/registry';
import { info, CliError } from '../cli.js';

export const infoCommand: Command = {
  name: 'info',
  description: 'Display asset metadata from the registry.',
  options: [],
  handler: async (context) => {
    const { args, json } = context;

    const assetId = args[0];
    if (!assetId) {
      throw new CliError(
        'Missing required argument: <assetId>. Usage: simplify info <assetId>',
        'MISSING_ARGUMENT',
      );
    }

    const client = new RegistryClient();
    const asset = await client.getAsset(assetId);

    if (asset === null) {
      throw new CliError(`Asset not found: "${assetId}".`, 'ASSET_NOT_FOUND');
    }

    if (json) {
      console.log(JSON.stringify(asset, null, 2));
      return;
    }

    info(`Asset: ${asset.id}`, json);
    info(`Name: ${asset.name}`, json);
    info(`Version: ${asset.version}`, json);
    info(`Publisher: ${asset.publisher}`, json);
    info(`Category: ${asset.category}`, json);
    info(`Status: ${asset.status}`, json);
    info(`Description: ${asset.description}`, json);
    info(`License: ${asset.license}`, json);

    const targets = asset.targets.map((target) => {
      const parts = [target.language];
      if (target.framework) {
        parts.push(target.framework);
      }
      return parts.join('/');
    });
    info(`Targets: ${targets.join(', ')}`, json);
  },
};
