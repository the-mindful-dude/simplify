import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { InstallationPlan } from './types.js';
import type { ConfigurationChange, EnvironmentVariable } from '@simplify-dev/schemas';
import {
  PackageInstaller,
  type PackageInstallResult,
  type SupportedPackageManager,
} from './package-installer.js';
import { RegistryClient } from '@simplify-dev/registry';
import { assertSafePath } from './path-safety.js';
import {
  rollback,
  safeWrite,
  SafeWriteError,
  type BackupRecord,
  type SafeWriteResult,
} from './safe-write.js';

export type HybridInstallerErrorCode =
  | 'CONFIG_APPLY_FAILED'
  | 'PARTIAL_INSTALL'
  | 'UNSAFE_PATH'
  | 'WRITE_FAILED'
  | 'PKG_INSTALL_FAILED'
  | 'ROLLBACK_FAILED';

export class HybridInstallerError extends Error {
  readonly code: HybridInstallerErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: HybridInstallerErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'HybridInstallerError';
    this.code = code;
    this.details = details ?? {};
  }
}

export interface HybridInstallerOptions {
  readonly plan: InstallationPlan;
  readonly cwd?: string;
  readonly dryRun?: boolean;
  readonly conflictPolicy?: 'overwrite' | 'skip-modified';
  readonly packageManager?: SupportedPackageManager | 'bun' | 'unknown' | string;
  readonly registryRoot?: string;
}

export interface HybridInstallResult {
  readonly filesInstalled: readonly string[];
  readonly packagesInstalled: readonly PackageInstallResult[];
  readonly configChanges: readonly string[];
  readonly envChanges: readonly string[];
  readonly manualSteps: readonly string[];
  readonly rolledBack?: boolean;
}

function parseDotEnv(content: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (key.length > 0) {
      result.set(key, trimmed.slice(eq + 1));
    }
  }
  return result;
}

function formatEnvExampleLine(variable: EnvironmentVariable): string {
  const lines: string[] = [];
  if (variable.description) {
    lines.push(`# ${variable.description}`);
  }
  const prefix = variable.required ? '' : '# ';
  const example = variable.example ?? '';
  lines.push(`${prefix}${variable.name}=${example}`);
  return lines.join('\n');
}

function appendEnvExample(
  existing: string,
  variables: readonly EnvironmentVariable[],
): { content: string; added: readonly string[] } {
  const parsed = parseDotEnv(existing);
  const added: string[] = [];
  let next = existing;
  if (next.length > 0 && !next.endsWith('\n')) {
    next += '\n';
  }
  for (const variable of variables) {
    if (parsed.has(variable.name)) {
      continue;
    }
    if (added.length === 0 && next.trim().length > 0) {
      next += '\n';
    }
    next += `${formatEnvExampleLine(variable)}\n`;
    added.push(variable.name);
  }
  return { content: next, added };
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function applyJsonConfigChange(content: string | null, change: ConfigurationChange): string {
  let parsed: Record<string, unknown> = {};
  if (content !== null && content.trim().length > 0) {
    parsed = JSON.parse(content) as Record<string, unknown>;
  }

  switch (change.operation) {
    case 'merge': {
      if (!change.data || typeof change.data !== 'object' || Array.isArray(change.data)) {
        throw new Error(`"merge" operation requires object data.`);
      }
      parsed = deepMerge(parsed, change.data as Record<string, unknown>);
      break;
    }
    case 'append-example': {
      // Declarative JSON-safe append-example: merge provided example data when present.
      // If no structured data is provided, report-only/manual handling is expected upstream.
      if (change.data && typeof change.data === 'object' && !Array.isArray(change.data)) {
        parsed = deepMerge(parsed, change.data as Record<string, unknown>);
      } else {
        throw new Error(
          `"append-example" for JSON requires declarative object data to apply safely.`,
        );
      }
      break;
    }
    default: {
      throw new Error(`Unsupported config operation: ${String(change.operation)}`);
    }
  }

  return `${JSON.stringify(parsed, null, 2)}
`;
}

/**
 * Writes an installer-managed file via safeWrite and classifies failures as
 * WRITE_FAILED (or UNSAFE_PATH) regardless of the underlying error shape.
 */
async function writeManagedFile(options: {
  readonly targetPath: string;
  readonly content: string | Uint8Array;
  readonly backup: boolean;
  readonly cwd: string;
}): Promise<SafeWriteResult> {
  try {
    return await safeWrite(options);
  } catch (error) {
    const isUnsafePath = error instanceof SafeWriteError && error.code === 'UNSAFE_PATH';
    throw new HybridInstallerError(
      isUnsafePath ? 'UNSAFE_PATH' : 'WRITE_FAILED',
      error instanceof Error ? error.message : `Failed to write "${options.targetPath}".`,
      {
        target: options.targetPath,
        ...(error instanceof SafeWriteError ? error.details : {}),
      },
    );
  }
}

export class HybridInstaller {
  async install(options: HybridInstallerOptions): Promise<HybridInstallResult> {
    const {
      plan,
      cwd = process.cwd(),
      dryRun = false,
      conflictPolicy = 'overwrite',
      packageManager,
      registryRoot,
    } = options;

    const filesInstalled: string[] = [];
    const packagesInstalled: PackageInstallResult[] = [];
    const configChanges: string[] = [];
    const envChanges: string[] = [];
    const manualSteps = plan.setupSteps.map((step) => step.description);
    const backups: BackupRecord[] = [];

    const tryRollback = async (): Promise<boolean> => {
      if (backups.length === 0) {
        return false;
      }
      try {
        await rollback(backups);
        return true;
      } catch (error) {
        throw new HybridInstallerError(
          'ROLLBACK_FAILED',
          `Rollback failed after install error: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { originalBackups: backups.length },
        );
      }
    };

    try {
      // 1) Source/hybrid file installation
      if (plan.fileChanges.length > 0) {
        const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
        const assetVersions = new Map(
          plan.resolvedAssets.map((resolved) => [resolved.id, resolved.version] as const),
        );
        for (const change of plan.fileChanges) {
          try {
            assertSafePath(change.target, cwd);
          } catch (error) {
            throw new HybridInstallerError(
              'UNSAFE_PATH',
              error instanceof Error ? error.message : 'Unsafe target path.',
              { target: change.target },
            );
          }

          const shouldSkip =
            conflictPolicy === 'skip-modified' &&
            (change.status === 'modified' || change.status === 'user-owned');
          if (shouldSkip) {
            continue;
          }

          if (dryRun) {
            filesInstalled.push(change.target);
            continue;
          }

          const assetId = change.assetId || plan.assetId;
          const version = assetVersions.get(assetId) ?? plan.version;
          const content = await client.getAssetFile(assetId, version, change.source);
          const targetAbsolute = resolve(cwd, change.target);
          const exists = existsSync(targetAbsolute);
          const result = await writeManagedFile({
            targetPath: change.target,
            content,
            backup: exists,
            cwd,
          });
          if (result.backupPath) {
            backups.push({
              originalPath: targetAbsolute,
              backupPath: result.backupPath,
              timestamp: new Date().toISOString(),
            });
          }
          filesInstalled.push(change.target);
        }
      }

      // 2) Package installation (package/hybrid)
      if (plan.packageDependencies.length > 0) {
        const seen = new Set<string>();
        for (const dependency of plan.packageDependencies) {
          if (dependency.kind === 'optional') {
            continue;
          }
          const key = `${dependency.name}@${dependency.version}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);

          if (dryRun) {
            packagesInstalled.push({
              packageName: dependency.name,
              version: dependency.version,
              installed: false,
              command: `[dry-run] install ${dependency.name}@${dependency.version}`,
              lockfileUpdated: false,
            });
            continue;
          }

          const installer = new PackageInstaller({
            cwd,
            dryRun: false,
          });
          const result = await installer.install({
            packageName: dependency.name,
            version: dependency.version,
            cwd,
            ...(packageManager !== undefined ? { packageManager } : {}),
            kind: dependency.kind,
          });
          packagesInstalled.push(result);
        }
      }

      // 3) Apply declarative config changes (safe, JSON-structured only)
      for (const change of plan.configurationChanges) {
        const target = change.file;
        try {
          assertSafePath(target, cwd);
        } catch (error) {
          throw new HybridInstallerError(
            'UNSAFE_PATH',
            error instanceof Error ? error.message : 'Unsafe config target path.',
            { file: target },
          );
        }

        if (change.format !== 'json') {
          throw new HybridInstallerError(
            'CONFIG_APPLY_FAILED',
            `Unsupported config format "${change.format}" for "${target}". Only declarative JSON changes are applied automatically.`,
            { file: target, format: change.format },
          );
        }

        const absolute = resolve(cwd, target);
        const exists = existsSync(absolute);
        let existingContent: string | null = null;
        if (exists) {
          existingContent = readFileSync(absolute, 'utf8');
        }

        let nextContent: string;
        try {
          nextContent = applyJsonConfigChange(existingContent, change);
        } catch (error) {
          throw new HybridInstallerError(
            'CONFIG_APPLY_FAILED',
            `Failed to apply config change to "${target}": ${
              error instanceof Error ? error.message : String(error)
            }`,
            { file: target, operation: change.operation },
          );
        }

        if (dryRun) {
          configChanges.push(`${change.operation}:${target}`);
          continue;
        }

        const result = await writeManagedFile({
          targetPath: target,
          content: nextContent,
          backup: exists,
          cwd,
        });
        if (result.backupPath) {
          backups.push({
            originalPath: absolute,
            backupPath: result.backupPath,
            timestamp: new Date().toISOString(),
          });
        }
        configChanges.push(`${change.operation}:${target}`);
      }

      // 4) .env.example merge (append only, never touch .env secrets)
      if (plan.environmentVariables.length > 0) {
        const envExamplePath = '.env.example';
        const absolute = resolve(cwd, envExamplePath);
        const exists = existsSync(absolute);
        const existing = exists ? readFileSync(absolute, 'utf8') : '';
        const merged = appendEnvExample(existing, plan.environmentVariables);

        if (merged.added.length > 0) {
          if (dryRun) {
            envChanges.push(...merged.added);
          } else {
            try {
              assertSafePath(envExamplePath, cwd);
            } catch (error) {
              throw new HybridInstallerError(
                'UNSAFE_PATH',
                error instanceof Error ? error.message : 'Unsafe .env.example path.',
                { file: envExamplePath },
              );
            }
            // Ensure parent exists (usually project root) and write safely
            mkdirSync(dirname(absolute), { recursive: true });
            const result = await writeManagedFile({
              targetPath: envExamplePath,
              content: merged.content,
              backup: exists,
              cwd,
            });
            if (result.backupPath) {
              backups.push({
                originalPath: absolute,
                backupPath: result.backupPath,
                timestamp: new Date().toISOString(),
              });
            }
            envChanges.push(...merged.added);
          }
        }
      }

      // 5) Verification (lightweight): confirm planned files exist after non-dry run
      if (!dryRun) {
        for (const target of filesInstalled) {
          const absolute = resolve(cwd, target);
          if (!existsSync(absolute)) {
            throw new HybridInstallerError(
              'PARTIAL_INSTALL',
              `Verification failed: expected installed file is missing: "${target}".`,
              { target },
            );
          }
        }
      }

      return {
        filesInstalled,
        packagesInstalled,
        configChanges,
        envChanges,
        manualSteps,
      };
    } catch (error) {
      if (dryRun) {
        throw error;
      }

      const rolledBack = await tryRollback();
      if (error instanceof HybridInstallerError) {
        if (rolledBack) {
          throw new HybridInstallerError(error.code, error.message, {
            ...error.details,
            rolledBack: true,
          });
        }
        throw error;
      }

      if (error instanceof SafeWriteError) {
        throw new HybridInstallerError(
          error.code === 'UNSAFE_PATH' ? 'UNSAFE_PATH' : 'WRITE_FAILED',
          error.message,
          { ...error.details, rolledBack },
        );
      }

      // PackageInstallerError and other errors: preserve message, mark partial install
      const message = error instanceof Error ? error.message : 'Hybrid installation failed.';
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : undefined;
      const mappedCode: HybridInstallerErrorCode =
        code === 'PKG_INSTALL_FAILED' || code === 'PKG_MGR_NOT_FOUND'
          ? 'PKG_INSTALL_FAILED'
          : 'PARTIAL_INSTALL';

      throw new HybridInstallerError(mappedCode, message, {
        ...(error && typeof error === 'object' && 'details' in error
          ? ((error as { details?: Record<string, unknown> }).details ?? {})
          : {}),
        rolledBack,
      });
    }
  }
}
