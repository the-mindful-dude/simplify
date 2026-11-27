import type { InstallationMode, ProjectConfiguration } from '@simplify-dev/schemas';
import { CliError } from '../cli.js';
import { ProjectDetector } from '../detection/index.js';
import type { ProjectDetectionResult } from '../detection/types.js';
import { loadConfig } from '../installation/config.js';

export interface ProjectContext {
  readonly cwd: string;
  readonly config: ProjectConfiguration;
  readonly detection: ProjectDetectionResult;
}

const INSTALLATION_MODES: readonly InstallationMode[] = ['package', 'source', 'hybrid'];

function fallbackDetection(cwd: string, config: ProjectConfiguration): ProjectDetectionResult {
  const packageManager =
    config.packageManager === undefined || config.packageManager === 'bun'
      ? 'unknown'
      : config.packageManager;
  return {
    projectRoot: cwd,
    language: 'unknown',
    framework: 'unknown',
    packageManager,
    versions: {},
    sourceDirectories: [],
    importAliases: {},
    monorepo: { isMonorepo: false },
    simplifyConfig: true,
  };
}

export function loadProjectContext(cwd: string = process.cwd()): ProjectContext {
  let config: ProjectConfiguration;
  try {
    config = loadConfig(cwd);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(
      `No valid simplify.config.json found in "${cwd}". Run "simplify init" before installing assets. (${detail})`,
      'CONFIG_NOT_FOUND',
    );
  }

  let detection: ProjectDetectionResult;
  try {
    const detector = new ProjectDetector();
    detector.detectProjectRoot(cwd);
    detection = { ...detector.detectAll(), projectRoot: cwd };
  } catch {
    detection = fallbackDetection(cwd, config);
  }

  return { cwd, config, detection };
}

export function parseInstallationMode(value: unknown): InstallationMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !INSTALLATION_MODES.includes(value as InstallationMode)) {
    throw new CliError(
      `Invalid installation mode: "${String(value)}". Expected one of: ${INSTALLATION_MODES.join(', ')}.`,
      'INVALID_MODE',
    );
  }
  return value as InstallationMode;
}

export function parseOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function toCliError(error: unknown, fallbackCode: string): CliError {
  if (error instanceof CliError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error !== null && typeof error === 'object' && 'code' in error
      ? String((error as { readonly code?: unknown }).code)
      : fallbackCode;
  return new CliError(message, code);
}
