import { projectConfigurationSchema } from '@simplify-dev/schemas';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectConfiguration, ProjectInstallationPaths } from '@simplify-dev/schemas';

export const CONFIG_FILE_NAME = 'simplify.config.json';

export interface DetectionResult {
  readonly language: string;
  readonly framework?: string;
  readonly packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun';
  readonly root?: string;
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}

export interface ValidationResult<T> {
  readonly valid: boolean;
  readonly value?: T;
  readonly issues: readonly ValidationIssue[];
}

const DEFAULT_PATHS = {
  ui: '@/components/ui',
  blocks: '@/components/blocks',
  logic: '@/lib',
  integrations: '@/lib/integrations',
  hooks: '@/hooks',
  styles: '@/styles',
};

const DEFAULT_MODE = 'hybrid' as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const projectConfigurationValidator = ajv.compile(projectConfigurationSchema);

function toIssues(errors: unknown[]): readonly ValidationIssue[] {
  if (!errors) {
    return [];
  }
  return errors.map((error) => {
    const instancePath =
      typeof error === 'object' && error !== null && 'instancePath' in error
        ? String(error.instancePath)
        : '';
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Schema validation failed.';
    const keyword =
      typeof error === 'object' && error !== null && 'keyword' in error
        ? String(error.keyword)
        : 'unknown';
    return {
      path: instancePath.length > 0 ? instancePath : '/',
      message: message.length > 0 ? message : 'Schema validation failed.',
      keyword,
    };
  });
}

function validateWith(value: unknown): ValidationResult<ProjectConfiguration> {
  if (projectConfigurationValidator(value)) {
    return {
      valid: true,
      value: value as unknown as ProjectConfiguration,
      issues: [],
    };
  }
  const errors = projectConfigurationValidator.errors;
  return { valid: false, issues: toIssues(errors ?? []) };
}

export function validateConfig(config: unknown): ValidationResult<ProjectConfiguration> {
  return validateWith(config);
}

export function loadConfig(cwd?: string): ProjectConfiguration {
  const root = cwd ?? process.cwd();
  const filePath = join(root, CONFIG_FILE_NAME);
  if (!existsSync(filePath)) {
    throw new Error(`No ${CONFIG_FILE_NAME} found in "${root}".`);
  }
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read ${CONFIG_FILE_NAME} in "${root}": ${error}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${CONFIG_FILE_NAME} in "${root}": ${error}`);
  }
  const result = validateConfig(parsed);
  if (!result.valid || !result.value) {
    const issues = result.issues
      .map((issue) => `${issue.path}: ${issue.message} (${issue.keyword})`)
      .join(', ');
    throw new Error(`Invalid ${CONFIG_FILE_NAME} in "${root}": ${issues}`);
  }
  return result.value;
}

export function saveConfig(config: ProjectConfiguration, cwd?: string): void {
  const root = cwd ?? process.cwd();
  const filePath = join(root, CONFIG_FILE_NAME);
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function initConfig(detectionResult: DetectionResult): ProjectConfiguration {
  return {
    schemaVersion: 1,
    packageManager: detectionResult.packageManager ?? 'pnpm',
    installation: {
      defaultMode: DEFAULT_MODE,
      paths: { ...DEFAULT_PATHS },
    },
  };
}

export function getInstallationPaths(config: ProjectConfiguration): ProjectInstallationPaths {
  return { ...DEFAULT_PATHS, ...config.installation.paths };
}
