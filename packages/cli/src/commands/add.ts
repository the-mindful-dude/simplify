import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { AssetManifest, InstallationMode } from '@simplify-dev/schemas';
import { RegistryClient } from '@simplify-dev/registry';
import type { Command } from './index.js';
import { info, warning, success, CliError } from '../cli.js';
import {
  HybridInstaller,
  InstallationPlanError,
  PackageInstaller,
  SourceInstaller,
  planInstallation,
} from '../installation/index.js';
import type { FileChange, InstallationPlan } from '../installation/types.js';
import {
  getInstalledAsset,
  hashContent,
  readLockFile,
  recordInstallation,
  writeLockFile,
  type InstalledAssetRecord,
  type LockedFile,
} from '../installation/lockfile.js';
import {
  loadProjectContext,
  parseInstallationMode,
  parseOptionalString,
  toCliError,
} from './project-context.js';

export interface ExecuteInstallationOptions {
  readonly plan: InstallationPlan;
  readonly asset: AssetManifest;
  readonly cwd: string;
  readonly dryRun: boolean;
  readonly verbose: boolean;
  readonly json?: boolean;
  readonly packageManager?: string;
  readonly registryRoot?: string;
  readonly files?: readonly FileChange[];
  readonly conflictPolicy?: 'reject' | 'overwrite' | 'skip-modified';
}

export function findPackageName(asset: AssetManifest, mode: InstallationMode): string | undefined {
  return asset.installation?.modes?.find((definition) => definition.mode === mode)?.packageName;
}

function formatConflicts(conflicts: readonly FileChange[]): string {
  return conflicts.map((change) => change.target).join(', ');
}

async function applySupplementalChanges(
  plan: InstallationPlan,
  options: {
    readonly cwd: string;
    readonly dryRun: boolean;
    readonly packageManager?: string;
    readonly registryRoot?: string;
    readonly includePackages: boolean;
  },
): Promise<void> {
  const hasConfig = plan.configurationChanges.length > 0 || plan.environmentVariables.length > 0;
  const hasPackages = options.includePackages && plan.packageDependencies.length > 0;
  if (!hasConfig && !hasPackages) {
    return;
  }

  const installer = new HybridInstaller();
  const result = await installer.install({
    plan: {
      ...plan,
      fileChanges: [],
      packageDependencies: options.includePackages ? plan.packageDependencies : [],
    },
    cwd: options.cwd,
    dryRun: options.dryRun,
    ...(options.packageManager !== undefined ? { packageManager: options.packageManager } : {}),
    ...(options.registryRoot !== undefined ? { registryRoot: options.registryRoot } : {}),
  });

  for (const step of result.manualSteps) {
    warning(`Manual step: ${step}`, false);
  }
}

export async function executeInstallationPlan(options: ExecuteInstallationOptions): Promise<void> {
  const { plan, asset, cwd, dryRun, verbose } = options;
  const conflictPolicy = options.conflictPolicy ?? 'reject';
  const requested = options.files ?? plan.fileChanges;

  const selected: FileChange[] = [];
  const conflicts: FileChange[] = [];

  for (const change of requested) {
    if (change.status === 'unchanged') {
      continue;
    }
    if (change.status === 'modified' || change.status === 'user-owned') {
      if (conflictPolicy === 'reject') {
        conflicts.push(change);
        continue;
      }
      if (conflictPolicy === 'skip-modified') {
        warning(`Skipping locally modified file: ${change.target}`, false);
        continue;
      }
    }
    selected.push(change);
  }

  if (conflicts.length > 0) {
    throw new CliError(
      `Refusing to overwrite ${conflicts.length} existing file(s): ${formatConflicts(conflicts)}. Move or remove them, or use "simplify update" to reconcile changes.`,
      'FILE_CONFLICT',
    );
  }

  const versions = Object.fromEntries(
    plan.resolvedAssets.map((resolved) => [resolved.id, resolved.version] as const),
  );

  if (plan.installationMode === 'source') {
    if (selected.length > 0) {
      const installer = new SourceInstaller({ cwd, dryRun, verbose });
      const result = await installer.install({
        assetId: plan.assetId,
        version: plan.version,
        files: selected,
        conflictPolicy: 'replace',
        cwd,
        dryRun,
        verbose,
        versions,
        ...(options.registryRoot !== undefined ? { registryRoot: options.registryRoot } : {}),
      });
      for (const message of result.warnings ?? []) {
        warning(message, false);
      }
    }
    await applySupplementalChanges(plan, {
      cwd,
      dryRun,
      ...(options.packageManager !== undefined ? { packageManager: options.packageManager } : {}),
      ...(options.registryRoot !== undefined ? { registryRoot: options.registryRoot } : {}),
      includePackages: true,
    });
    return;
  }

  if (plan.installationMode === 'hybrid') {
    const installer = new HybridInstaller();
    const result = await installer.install({
      plan: { ...plan, fileChanges: selected },
      cwd,
      dryRun,
      conflictPolicy: 'overwrite',
      ...(options.packageManager !== undefined ? { packageManager: options.packageManager } : {}),
      ...(options.registryRoot !== undefined ? { registryRoot: options.registryRoot } : {}),
    });
    for (const step of result.manualSteps) {
      warning(`Manual step: ${step}`, false);
    }
    return;
  }

  const packageName = findPackageName(asset, plan.installationMode);
  if (packageName === undefined) {
    throw new CliError(
      `Asset "${plan.assetId}" does not declare a package name for the "${plan.installationMode}" installation mode.`,
      'MISSING_PACKAGE_NAME',
    );
  }

  const installer = new PackageInstaller({ cwd, dryRun, verbose });
  const result = await installer.install({
    packageName,
    version: plan.version,
    cwd,
    dryRun,
    verbose,
    packageDependencies: plan.packageDependencies,
    ...(options.packageManager !== undefined ? { packageManager: options.packageManager } : {}),
  });
  for (const message of result.warnings ?? []) {
    warning(message, false);
  }

  await applySupplementalChanges(plan, {
    cwd,
    dryRun,
    ...(options.packageManager !== undefined ? { packageManager: options.packageManager } : {}),
    ...(options.registryRoot !== undefined ? { registryRoot: options.registryRoot } : {}),
    includePackages: false,
  });
}

function applyTargetPathOverride(
  plan: InstallationPlan,
  targetPath: string | undefined,
): InstallationPlan {
  if (targetPath === undefined) {
    return plan;
  }
  const base = targetPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return {
    ...plan,
    fileChanges: plan.fileChanges.map((change) => ({
      ...change,
      target: `${base}/${basename(change.target)}`,
    })),
  };
}

function printPlanSummary(plan: InstallationPlan, json: boolean): void {
  const newFiles = plan.fileChanges.filter((change) => change.status === 'new').length;
  const conflicts = plan.fileChanges.filter(
    (change) => change.status === 'modified' || change.status === 'user-owned',
  ).length;

  info(`  Mode: ${plan.installationMode}`, json);
  info(
    `  Files: ${plan.fileChanges.length} (${newFiles} new, ${conflicts} existing conflict${conflicts === 1 ? '' : 's'})`,
    json,
  );
  if (plan.packageDependencies.length > 0) {
    info(`  Packages: ${plan.packageDependencies.map((dep) => dep.name).join(', ')}`, json);
  }
  if (plan.environmentVariables.length > 0) {
    info(
      `  Environment variables: ${plan.environmentVariables.map((variable) => variable.name).join(', ')}`,
      json,
    );
  }
  if (plan.configurationChanges.length > 0) {
    info(
      `  Configuration changes: ${plan.configurationChanges.map((change) => change.file).join(', ')}`,
      json,
    );
  }
  if (plan.setupSteps.length > 0) {
    info(`  Manual setup steps: ${plan.setupSteps.length}`, json);
  }
}

export async function buildInstalledRecord(
  plan: InstallationPlan,
  cwd: string,
  registryRoot: string | undefined,
): Promise<InstalledAssetRecord> {
  const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
  const versions = new Map(
    plan.resolvedAssets.map((resolved) => [resolved.id, resolved.version] as const),
  );
  const files: LockedFile[] = [];

  for (const change of plan.fileChanges) {
    const absolute = resolve(cwd, change.target);
    if (!existsSync(absolute)) {
      continue;
    }
    const localContent = readFileSync(absolute);
    const localHash = hashContent(localContent);
    const assetVersion = versions.get(change.assetId) ?? plan.version;
    let sourceHash = localHash;
    try {
      const sourceContent = await client.getAssetFile(change.assetId, assetVersion, change.source);
      sourceHash = hashContent(sourceContent);
    } catch {
      sourceHash = localHash;
    }
    files.push({
      path: change.target,
      hash: localHash,
      sourceHash,
      assetId: change.assetId,
      source: change.source,
    });
  }

  return {
    id: plan.assetId,
    version: plan.version,
    mode: plan.installationMode,
    installedAt: new Date().toISOString(),
    files,
    packageDependencies: plan.packageDependencies.map((dependency) => ({
      name: dependency.name,
      version: dependency.version,
      kind: dependency.kind,
    })),
    registryDependencies: plan.resolvedAssets
      .filter((resolved) => resolved.id !== plan.assetId)
      .map((resolved) => ({ id: resolved.id, version: resolved.version })),
    configChanges: plan.configurationChanges.map((change) => ({
      file: change.file,
      format: change.format,
      operation: change.operation,
    })),
  };
}

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
      name: 'mode',
      type: 'string',
      description: 'Installation mode: package, source, or hybrid.',
    },
    {
      name: 'target-path',
      type: 'string',
      description: 'Base directory to install source files into.',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, verbose, json } = context;

    const assetId = args[0];
    if (!assetId) {
      throw new CliError(
        'Missing required argument: <assetId>. Usage: simplify add <assetId> [options]',
        'MISSING_ARGUMENT',
      );
    }
    if (args.length > 1) {
      throw new CliError(
        `add accepts a single asset ID. Unexpected arguments: ${args.slice(1).join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const version = parseOptionalString(options.version);
    const mode = parseInstallationMode(options.mode);
    const targetPath = parseOptionalString(options['target-path']);
    const project = loadProjectContext();

    let lock;
    try {
      lock = await readLockFile(project.cwd);
    } catch (error) {
      throw toCliError(error, 'LOCK_READ_FAILED');
    }

    const existing = getInstalledAsset(lock, assetId);
    if (existing !== undefined) {
      throw new CliError(
        `Asset "${assetId}" is already installed at version ${existing.version}. Use "simplify update ${assetId}" to change its version.`,
        'ALREADY_INSTALLED',
      );
    }

    let plan: InstallationPlan;
    try {
      plan = await planInstallation(
        {
          assetId,
          ...(version !== undefined ? { version } : {}),
          ...(mode !== undefined ? { mode } : {}),
          ...(targetPath !== undefined ? { targetPath } : {}),
          dryRun,
          cwd: project.cwd,
        },
        project.config,
        project.detection,
      );
    } catch (error) {
      if (error instanceof InstallationPlanError) {
        throw new CliError(error.message, error.code);
      }
      throw toCliError(error, 'INSTALLATION_PLAN_FAILED');
    }

    plan = applyTargetPathOverride(plan, targetPath);

    const registryRoot = project.config.registry?.url;
    const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
    let asset: AssetManifest | null;
    try {
      asset = await client.getAsset(plan.assetId, plan.version);
    } catch (error) {
      throw toCliError(error, 'REGISTRY_ERROR');
    }
    if (asset === null) {
      throw new CliError(`Asset not found: "${plan.assetId}" @${plan.version}.`, 'ASSET_NOT_FOUND');
    }

    if (dryRun) {
      info(`[dry-run] Would add "${plan.assetId}"@${plan.version}.`, json);
      printPlanSummary(plan, json);
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    info(`Adding "${plan.assetId}"@${plan.version}...`, json);
    printPlanSummary(plan, json);

    try {
      await executeInstallationPlan({
        plan,
        asset,
        cwd: project.cwd,
        dryRun,
        verbose,
        ...(project.config.packageManager !== undefined
          ? { packageManager: project.config.packageManager }
          : {}),
        ...(registryRoot !== undefined ? { registryRoot } : {}),
        conflictPolicy: 'reject',
      });
    } catch (error) {
      throw toCliError(error, 'INSTALLATION_FAILED');
    }

    let record: InstalledAssetRecord;
    try {
      record = await buildInstalledRecord(plan, project.cwd, registryRoot);
    } catch (error) {
      throw toCliError(error, 'LOCK_RECORD_FAILED');
    }

    try {
      await writeLockFile(recordInstallation(lock, record), project.cwd);
    } catch (error) {
      throw toCliError(error, 'LOCK_WRITE_FAILED');
    }

    success(`Installed "${plan.assetId}"@${plan.version} (${plan.installationMode}).`, json);
  },
};
