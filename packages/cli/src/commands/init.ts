import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectConfiguration } from '@simplify-dev/schemas';
import type { Command } from './index.js';
import type { CommandContext } from '../cli.js';
import { info, success, CliError } from '../cli.js';
import { ProjectDetector } from '../detection/index.js';
import { CONFIG_FILE_NAME, initConfig, saveConfig } from '../installation/config.js';
import {
  LOCK_FILE_PATH,
  createEmptyLockFile,
  lockFileExists,
  writeLockFile,
} from '../installation/lockfile.js';
import { toCliError } from './project-context.js';

function targetRoot(context: CommandContext): string {
  const candidate: unknown = 'cwd' in context ? context.cwd : undefined;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : process.cwd();
}

function buildInitialConfig(cwd: string): ProjectConfiguration {
  const detector = new ProjectDetector();
  try {
    if (detector.detectProjectRoot(cwd) === cwd) {
      const detection = detector.detectAll();
      return initConfig({
        language: detection.language,
        ...(detection.packageManager === 'unknown'
          ? {}
          : { packageManager: detection.packageManager }),
      });
    }
  } catch {
    // A project without detectable markers still receives the default configuration.
  }
  return initConfig({ language: 'unknown' });
}

export const initCommand: Command = {
  name: 'init',
  description: 'Initialize simplify configuration in the current project.',
  options: [],
  handler: async (context) => {
    const { args, dryRun, json } = context;

    if (args.length > 0) {
      throw new CliError(`init does not accept arguments: ${args.join(' ')}`, 'INVALID_ARGUMENT');
    }

    const cwd = targetRoot(context);
    const hasConfig = existsSync(join(cwd, CONFIG_FILE_NAME));
    const hasLock = lockFileExists(cwd);

    info(
      dryRun
        ? '[dry-run] Would initialize simplify configuration.'
        : 'Initializing simplify configuration...',
      json,
    );

    if (dryRun) {
      info(`[dry-run] Would ${hasConfig ? 'leave existing' : 'create'} ${CONFIG_FILE_NAME}.`, json);
      info(`[dry-run] Would ${hasLock ? 'leave existing' : 'create'} ${LOCK_FILE_PATH}.`, json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    if (hasConfig) {
      info(`${CONFIG_FILE_NAME} already exists; leaving it unchanged.`, json);
    } else {
      try {
        saveConfig(buildInitialConfig(cwd), cwd);
      } catch (error) {
        throw toCliError(error, 'CONFIG_WRITE_FAILED');
      }
      info(`Created ${CONFIG_FILE_NAME}.`, json);
    }

    if (hasLock) {
      info(`${LOCK_FILE_PATH} already exists; leaving it unchanged.`, json);
    } else {
      try {
        await writeLockFile(createEmptyLockFile(), cwd);
      } catch (error) {
        throw toCliError(error, 'LOCK_WRITE_FAILED');
      }
      info(`Created ${LOCK_FILE_PATH}.`, json);
    }

    success('Simplify configuration initialized.', json);
  },
};
