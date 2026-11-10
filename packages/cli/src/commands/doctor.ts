import { readFile } from 'node:fs/promises';
import type { Command } from './index.js';
import { RegistryClient } from '@simplify-dev/registry';
import { info, CliError } from '../cli.js';

const LOCK_FILE = '.simplify/lock.json';

interface DoctorCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly message: string;
}

export const doctorCommand: Command = {
  name: 'doctor',
  description: 'Validate project configuration and installation.',
  options: [],
  handler: async (context) => {
    const { json } = context;
    const checks: DoctorCheck[] = [];

    try {
      const client = new RegistryClient();
      await client.getRegistryIndex();
      checks.push({ name: 'registry', pass: true, message: 'Registry index is reachable.' });
    } catch (err) {
      checks.push({
        name: 'registry',
        pass: false,
        message: `Registry unreachable: ${(err as Error).message}`,
      });
    }

    try {
      await readFile(LOCK_FILE, 'utf8');
      checks.push({ name: 'lock-file', pass: true, message: `${LOCK_FILE} exists.` });
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException;
      checks.push({
        name: 'lock-file',
        pass: false,
        message:
          nodeError.code === 'ENOENT'
            ? `${LOCK_FILE} not found. Run simplify init.`
            : `${LOCK_FILE} is not readable.`,
      });
    }

    const allPass = checks.every((check) => check.pass);

    if (json) {
      console.log(JSON.stringify({ passed: allPass, checks }, null, 2));
      if (!allPass) {
        throw new CliError('Doctor checks failed.', 'DOCTOR_FAILED');
      }
      return;
    }

    for (const check of checks) {
      info(`${check.pass ? '✓' : '✗'} ${check.name}: ${check.message}`, json);
    }

    if (!allPass) {
      throw new CliError('Doctor checks failed.', 'DOCTOR_FAILED');
    }
    info('All checks passed.', json);
  },
};
