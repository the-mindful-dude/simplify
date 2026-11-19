import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RegistryClient } from '@simplify-dev/registry';
import type { Command } from './index.js';
import { info, CliError } from '../cli.js';
import { ProjectDetector } from '../detection/index.js';
import { CONFIG_FILE_NAME, validateConfig } from '../installation/config.js';
import {
  LOCK_DIRECTORY,
  LOCK_FILE_PATH,
  hashContent,
  lockFileExists,
  readLockFile,
} from '../installation/lockfile.js';

type DoctorStatus = 'healthy' | 'warning' | 'error';

interface DoctorCheck {
  readonly name: string;
  readonly status: DoctorStatus;
  readonly pass: boolean;
  readonly message: string;
  readonly details?: unknown;
}

function makeCheck(
  name: string,
  status: DoctorStatus,
  message: string,
  details?: unknown,
): DoctorCheck {
  return {
    name,
    status,
    pass: status !== 'error',
    message,
    ...(details === undefined ? {} : { details }),
  };
}

async function checkProjectConfiguration(
  cwd: string,
): Promise<{ check: DoctorCheck; registryUrl?: string }> {
  const configPath = join(cwd, CONFIG_FILE_NAME);
  if (!existsSync(configPath)) {
    return {
      check: makeCheck(
        'project-config',
        'error',
        `Project configuration is missing: ${CONFIG_FILE_NAME} was not found. Run "simplify init".`,
        { file: CONFIG_FILE_NAME },
      ),
    };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (error) {
    return {
      check: makeCheck(
        'project-config',
        'error',
        `Project configuration could not be read: ${error instanceof Error ? error.message : String(error)}`,
        { file: CONFIG_FILE_NAME },
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return {
      check: makeCheck(
        'project-config',
        'error',
        `Project configuration is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        { file: CONFIG_FILE_NAME },
      ),
    };
  }

  const validation = validateConfig(parsed);
  if (!validation.valid || !validation.value) {
    return {
      check: makeCheck('project-config', 'error', 'Project configuration is invalid.', {
        file: CONFIG_FILE_NAME,
        issues: validation.issues,
      }),
    };
  }

  const config = validation.value;
  const packageManager = config.packageManager ?? 'unspecified';
  const result: { check: DoctorCheck; registryUrl?: string } = {
    check: makeCheck(
      'project-config',
      'healthy',
      `Project configuration is valid (package manager: ${packageManager}).`,
      {
        file: CONFIG_FILE_NAME,
        packageManager,
        schemaVersion: config.schemaVersion,
      },
    ),
  };
  if (config.registry?.url !== undefined) {
    result.registryUrl = config.registry.url;
  }
  return result;
}

function checkProjectDetection(cwd: string): DoctorCheck {
  try {
    const detector = new ProjectDetector();
    detector.detectProjectRoot(cwd);
    const detected = detector.detectAll();
    const framework = detected.framework ?? 'unknown';
    const packageManager = detected.packageManager ?? 'unknown';
    const unknowns = [
      framework === 'unknown' ? 'framework' : null,
      packageManager === 'unknown' ? 'package manager' : null,
    ].filter((value): value is string => value !== null);

    if (unknowns.length > 0) {
      return makeCheck(
        'project-detection',
        'warning',
        `Project detection completed with unknown ${unknowns.join(' and ')}.`,
        { framework, packageManager, language: detected.language },
      );
    }

    return makeCheck(
      'project-detection',
      'healthy',
      `Detected framework "${framework}" and package manager "${packageManager}".`,
      { framework, packageManager, language: detected.language },
    );
  } catch (error) {
    return makeCheck(
      'project-detection',
      'warning',
      `Project detection could not be completed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function checkSimplifyDirectory(cwd: string): DoctorCheck {
  const directoryPath = join(cwd, LOCK_DIRECTORY);
  if (existsSync(directoryPath)) {
    return makeCheck(
      'simplify-directory',
      'healthy',
      `Local simplify metadata directory "${LOCK_DIRECTORY}/" is present.`,
      { path: LOCK_DIRECTORY },
    );
  }
  return makeCheck(
    'simplify-directory',
    'warning',
    `Local simplify metadata directory "${LOCK_DIRECTORY}/" is not present. It will be created when assets are installed.`,
    { path: LOCK_DIRECTORY },
  );
}

async function checkInstalledAssets(cwd: string): Promise<DoctorCheck> {
  if (!lockFileExists(cwd)) {
    return makeCheck('lock-file', 'error', `${LOCK_FILE_PATH} not found. Run simplify init.`, {
      file: LOCK_FILE_PATH,
    });
  }

  let lock;
  try {
    lock = await readLockFile(cwd);
  } catch (error) {
    return makeCheck(
      'lock-file',
      'error',
      `${LOCK_FILE_PATH} could not be read or is invalid: ${error instanceof Error ? error.message : String(error)}`,
      { file: LOCK_FILE_PATH },
    );
  }

  const missing: Array<{ assetId: string; path: string }> = [];
  const modified: Array<{ assetId: string; path: string }> = [];

  for (const asset of lock.assets) {
    for (const file of asset.files) {
      const absolute = join(cwd, file.path);
      if (!existsSync(absolute)) {
        missing.push({ assetId: asset.id, path: file.path });
        continue;
      }
      try {
        const current = hashContent(readFileSync(absolute));
        if (current !== file.hash) {
          modified.push({ assetId: asset.id, path: file.path });
        }
      } catch {
        modified.push({ assetId: asset.id, path: file.path });
      }
    }
  }

  if (missing.length > 0 || modified.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`${missing.length} missing file(s)`);
    }
    if (modified.length > 0) {
      parts.push(`${modified.length} modified file hash(es)`);
    }
    const sample = [...missing, ...modified]
      .slice(0, 5)
      .map((entry) => `${entry.assetId}:${entry.path}`)
      .join(', ');
    return makeCheck(
      'lock-file',
      'error',
      `Installed asset integrity check failed: ${parts.join(', ')}. ${sample}`,
      { file: LOCK_FILE_PATH, missing, modified, assets: lock.assets.length },
    );
  }

  return makeCheck(
    'lock-file',
    'healthy',
    `${LOCK_FILE_PATH} is valid. ${lock.assets.length} installed asset(s) verified.`,
    { file: LOCK_FILE_PATH, assets: lock.assets.length },
  );
}

async function checkRegistry(registryUrl?: string): Promise<DoctorCheck> {
  try {
    const client = new RegistryClient(
      registryUrl !== undefined ? { registryRoot: registryUrl } : {},
    );
    await client.getRegistryIndex();
    return makeCheck(
      'registry',
      'healthy',
      'Registry index is reachable.',
      registryUrl !== undefined ? { registryUrl } : undefined,
    );
  } catch (error) {
    return makeCheck(
      'registry',
      'error',
      `Registry unreachable: ${error instanceof Error ? error.message : String(error)}`,
      registryUrl !== undefined ? { registryUrl } : undefined,
    );
  }
}

export const doctorCommand: Command = {
  name: 'doctor',
  description: 'Validate project configuration and installation.',
  options: [],
  handler: async (context) => {
    const { json } = context;
    const cwd = process.cwd();

    const configResult = await checkProjectConfiguration(cwd);
    const detectionCheck = checkProjectDetection(cwd);
    const directoryCheck = checkSimplifyDirectory(cwd);
    const lockCheck = await checkInstalledAssets(cwd);
    const registryCheck = await checkRegistry(configResult.registryUrl);

    const checks: DoctorCheck[] = [
      registryCheck,
      configResult.check,
      detectionCheck,
      directoryCheck,
      lockCheck,
    ];

    const hasErrors = checks.some((check) => check.status === 'error');
    const overallStatus: DoctorStatus = hasErrors
      ? 'error'
      : checks.some((check) => check.status === 'warning')
        ? 'warning'
        : 'healthy';
    const passed = !hasErrors;

    if (json) {
      console.log(JSON.stringify({ passed, status: overallStatus, checks }, null, 2));
      if (hasErrors) {
        throw new CliError('Doctor checks failed.', 'DOCTOR_FAILED');
      }
      return;
    }

    for (const check of checks) {
      info(`${check.status === 'error' ? '✗' : '✓'} ${check.name}: ${check.message}`, json);
    }

    if (hasErrors) {
      throw new CliError('Doctor checks failed.', 'DOCTOR_FAILED');
    }

    if (overallStatus === 'warning') {
      info('Doctor completed with warnings.', json);
      return;
    }

    info('All checks passed.', json);
  },
};
