import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { RegistryClient } from '@simplify-dev/registry';
import type { AssetManifest } from '@simplify-dev/schemas';
import type { Command } from './index.js';
import { info, warning, success, CliError } from '../cli.js';
import {
  InstallationPlanError,
  createBackup,
  planInstallation,
  assertSafePath,
} from '../installation/index.js';
import type { FileChange, InstallationPlan } from '../installation/types.js';
import {
  getInstalledAsset,
  hashContent,
  readLockFile,
  recordInstallation,
  writeLockFile,
  type InstalledAssetRecord,
  type LockFile,
  type LockedFile,
} from '../installation/lockfile.js';
import { executeInstallationPlan } from './add.js';
import {
  loadProjectContext,
  parseOptionalString,
  toCliError,
  type ProjectContext,
} from './project-context.js';

interface ManualReview {
  readonly path: string;
  readonly reason: string;
}

interface UpdateAnalysis {
  readonly plan: InstallationPlan;
  readonly asset: AssetManifest;
  readonly safeFiles: readonly FileChange[];
  readonly newFiles: readonly FileChange[];
  readonly removedFiles: readonly LockedFile[];
  readonly manualReview: readonly ManualReview[];
}

function localFileHash(cwd: string, relativePath: string): string | undefined {
  const absolute = resolve(cwd, relativePath);
  if (!existsSync(absolute)) {
    return undefined;
  }
  return hashContent(readFileSync(absolute));
}

async function registryFileHash(
  client: RegistryClient,
  change: FileChange,
  versions: ReadonlyMap<string, string>,
  fallbackVersion: string,
): Promise<string | undefined> {
  try {
    const content = await client.getAssetFile(
      change.assetId,
      versions.get(change.assetId) ?? fallbackVersion,
      change.source,
    );
    return hashContent(content);
  } catch {
    return undefined;
  }
}

async function analyzeUpdate(
  project: ProjectContext,
  record: InstalledAssetRecord,
  targetVersion: string | undefined,
  client: RegistryClient,
): Promise<UpdateAnalysis | null> {
  let plan: InstallationPlan;
  try {
    plan = await planInstallation(
      {
        assetId: record.id,
        ...(targetVersion !== undefined ? { version: targetVersion } : {}),
        mode: record.mode,
        dryRun: true,
        cwd: project.cwd,
      },
      project.config,
      project.detection,
    );
  } catch (error) {
    if (error instanceof InstallationPlanError) {
      throw new CliError(error.message, error.code);
    }
    throw toCliError(error, 'UPDATE_PLAN_FAILED');
  }

  if (plan.version === record.version) {
    return null;
  }

  let asset: AssetManifest | null;
  try {
    asset = await client.getAsset(plan.assetId, plan.version);
  } catch (error) {
    throw toCliError(error, 'REGISTRY_ERROR');
  }
  if (asset === null) {
    throw new CliError(`Asset not found: "${plan.assetId}" @${plan.version}.`, 'ASSET_NOT_FOUND');
  }

  const oldByPath = new Map(record.files.map((file) => [file.path, file] as const));
  const planByPath = new Map(plan.fileChanges.map((change) => [change.target, change] as const));

  const safeFiles: FileChange[] = [];
  const newFiles: FileChange[] = [];
  const manualReview: ManualReview[] = [];

  for (const change of plan.fileChanges) {
    const old = oldByPath.get(change.target);
    const current = localFileHash(project.cwd, change.target);
    if (old === undefined) {
      newFiles.push(change);
      safeFiles.push(change);
      continue;
    }
    if (current === undefined) {
      safeFiles.push(change);
      continue;
    }
    if (current === old.hash) {
      safeFiles.push(change);
      continue;
    }
    manualReview.push({ path: change.target, reason: 'modified locally' });
  }

  const removedFiles: LockedFile[] = [];
  for (const old of record.files) {
    if (planByPath.has(old.path)) {
      continue;
    }
    const current = localFileHash(project.cwd, old.path);
    if (current === undefined || current === old.hash) {
      removedFiles.push(old);
      continue;
    }
    manualReview.push({
      path: old.path,
      reason: 'removed from the registry but modified locally',
    });
  }

  return { plan, asset, safeFiles, newFiles, removedFiles, manualReview };
}

function printUpdatePlan(
  record: InstalledAssetRecord,
  analysis: UpdateAnalysis,
  json: boolean,
): void {
  info(`Update plan for "${record.id}": ${record.version} -> ${analysis.plan.version}`, json);
  info(`  Safe to update: ${analysis.safeFiles.length} file(s)`, json);
  info(`  New files: ${analysis.newFiles.length}`, json);
  info(`  Removed files: ${analysis.removedFiles.length}`, json);
  info(`  Manual review required: ${analysis.manualReview.length} file(s)`, json);
  for (const review of analysis.manualReview) {
    warning(`  ${review.path}: ${review.reason}`, json);
  }
  if (analysis.plan.packageDependencies.length > 0) {
    info(
      `  Package dependencies: ${analysis.plan.packageDependencies
        .map((dependency) => `${dependency.name}@${dependency.version}`)
        .join(', ')}`,
      json,
    );
  }
}

async function removeManagedFile(cwd: string, file: LockedFile): Promise<boolean> {
  assertSafePath(file.path, cwd);
  const absolute = resolve(cwd, file.path);
  if (!existsSync(absolute)) {
    return true;
  }
  const current = hashContent(readFileSync(absolute));
  if (current !== file.hash) {
    return false;
  }
  await createBackup(absolute);
  unlinkSync(absolute);
  return true;
}

async function buildUpdatedFiles(
  project: ProjectContext,
  record: InstalledAssetRecord,
  analysis: UpdateAnalysis,
  client: RegistryClient,
): Promise<LockedFile[]> {
  const versions = new Map(
    analysis.plan.resolvedAssets.map((resolved) => [resolved.id, resolved.version] as const),
  );
  const oldByPath = new Map(record.files.map((file) => [file.path, file] as const));
  const planByPath = new Map(
    analysis.plan.fileChanges.map((change) => [change.target, change] as const),
  );
  const manualPaths = new Set(analysis.manualReview.map((review) => review.path));
  const removedPaths = new Set(analysis.removedFiles.map((file) => file.path));
  const files: LockedFile[] = [];

  for (const change of analysis.plan.fileChanges) {
    if (manualPaths.has(change.target)) {
      const old = oldByPath.get(change.target);
      if (old !== undefined) {
        files.push(old);
      }
      continue;
    }
    const localHash = localFileHash(project.cwd, change.target);
    if (localHash === undefined) {
      continue;
    }
    const sourceHash =
      (await registryFileHash(client, change, versions, analysis.plan.version)) ?? localHash;
    files.push({
      path: change.target,
      hash: localHash,
      sourceHash,
      assetId: change.assetId,
      source: change.source,
    });
  }

  for (const old of record.files) {
    if (planByPath.has(old.path) || removedPaths.has(old.path)) {
      continue;
    }
    if (!files.some((file) => file.path === old.path)) {
      files.push(old);
    }
  }

  return files;
}

export const updateCommand: Command = {
  name: 'update',
  description: 'Update installed assets to newer registry versions.',
  options: [
    {
      name: 'version',
      type: 'string',
      description: 'Specific version to update to (requires a single asset ID).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show the update plan without making changes.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, verbose, json } = context;
    const assetId = args[0];
    if (args.length > 1) {
      throw new CliError(
        `update accepts at most one asset ID. Unexpected arguments: ${args.slice(1).join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const project = loadProjectContext();
    let lock: LockFile;
    try {
      lock = await readLockFile(project.cwd);
    } catch (error) {
      throw toCliError(error, 'LOCK_READ_FAILED');
    }

    let targets: readonly InstalledAssetRecord[];
    if (assetId !== undefined) {
      const record = getInstalledAsset(lock, assetId);
      if (record === undefined) {
        throw new CliError(`Asset "${assetId}" is not installed.`, 'NOT_INSTALLED');
      }
      targets = [record];
    } else {
      targets = lock.assets;
    }

    if (targets.length === 0) {
      info('No installed assets to update.', json);
      return;
    }

    const requestedVersion = parseOptionalString(options.version);
    if (requestedVersion !== undefined && targets.length > 1) {
      throw new CliError(
        'The --version option requires a single asset ID. Usage: simplify update <assetId> --version <version>',
        'INVALID_ARGUMENT',
      );
    }

    const registryRoot = project.config.registry?.url;
    const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
    let nextLock = lock;
    let updatedCount = 0;

    for (const record of targets) {
      let targetVersion = requestedVersion;
      if (targetVersion === undefined) {
        let latest: AssetManifest | null;
        try {
          latest = await client.getAsset(record.id);
        } catch (error) {
          throw toCliError(error, 'REGISTRY_ERROR');
        }
        if (latest === null) {
          warning(`Asset "${record.id}" is no longer available in the registry. Skipping.`, json);
          continue;
        }
        targetVersion = latest.version;
      }

      const analysis = await analyzeUpdate(project, record, targetVersion, client);

      if (analysis === null) {
        info(`"${record.id}" is already up to date at ${record.version}.`, json);
        continue;
      }

      printUpdatePlan(record, analysis, json);

      if (dryRun) {
        continue;
      }

      await executeInstallationPlan({
        plan: analysis.plan,
        asset: analysis.asset,
        cwd: project.cwd,
        dryRun,
        verbose,
        files: analysis.safeFiles,
        conflictPolicy: 'overwrite',
        ...(project.config.packageManager !== undefined
          ? { packageManager: project.config.packageManager }
          : {}),
        ...(registryRoot !== undefined ? { registryRoot } : {}),
      });

      for (const file of analysis.removedFiles) {
        const removed = await removeManagedFile(project.cwd, file);
        if (!removed) {
          warning(
            `Preserved "${file.path}" because it was modified locally and could not be safely removed.`,
            json,
          );
        }
      }

      const files = await buildUpdatedFiles(project, record, analysis, client);
      const nextRecord: InstalledAssetRecord = {
        id: analysis.plan.assetId,
        version: analysis.plan.version,
        mode: analysis.plan.installationMode,
        installedAt: new Date().toISOString(),
        files,
        packageDependencies: analysis.plan.packageDependencies.map((dependency) => ({
          name: dependency.name,
          version: dependency.version,
          kind: dependency.kind,
        })),
        registryDependencies: analysis.plan.resolvedAssets
          .filter((resolved) => resolved.id !== analysis.plan.assetId)
          .map((resolved) => ({ id: resolved.id, version: resolved.version })),
        configChanges: analysis.plan.configurationChanges.map((change) => ({
          file: change.file,
          format: change.format,
          operation: change.operation,
        })),
      };

      nextLock = recordInstallation(nextLock, nextRecord);
      await writeLockFile(nextLock, project.cwd);
      updatedCount += 1;

      success(`Updated "${record.id}" from ${record.version} to ${analysis.plan.version}.`, json);
    }

    if (dryRun) {
      info('Dry-run complete. No changes were made.', json);
    } else if (updatedCount === 0) {
      info('All installed assets are up to date.', json);
    }
  },
};
