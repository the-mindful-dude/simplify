import type { Command } from './index.js';
import { info, CliError } from '../cli.js';

export const initCommand: Command = {
  name: 'init',
  description: 'Initialize simplify configuration in the current project.',
  options: [],
  handler: async (context) => {
    const { args, dryRun, json } = context;

    if (args.length > 0) {
      throw new CliError(`init does not accept arguments: ${args.join(' ')}`, 'INVALID_ARGUMENT');
    }

    info(
      dryRun
        ? '[dry-run] Would initialize simplify configuration.'
        : 'Initializing simplify configuration...',
      json,
    );

    if (!dryRun) {
      info('Configuration initialization is delegated to the installation subsystem.', json);
    }
  },
};
