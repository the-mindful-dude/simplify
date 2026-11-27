import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RegistryClient } from '@simplify-dev/registry';
import type { Command } from './index.js';
import { info, CliError } from '../cli.js';
import { InstallationPlanError, planInstallation } from '../installation/index.js';
import type { InstallationPlan } from '../installation/types.js';
import {
  getInstalledAsset,
  hashContent,
  readLockFile,
  type InstalledAssetRecord,
  type LockFile,
} from '../installation/lockfile.js';
import { loadProjectContext, parseOptionalString, toCliError } from './project-context.js';

type FileDiffStatus =
  'added' | 'removed' | 'modified' | 'modified-both' | 'updated' | 'unchanged' | 'deleted-locally';

interface FileDiff {
  readonly path: string;
  readonly status: FileDiffStatus;
  readonly localModified: boolean;
  readonly registryChanged: boolean;
}

interface DependencyChange {
  readonly name: string;
  readonly from: string;
  readonly to: string;
}

interface DependencyDiff {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly DependencyChange[];
}

interface DiffResult {
  readonly assetId: string;
  readonly installedVersion: string;
  readonly targetVersion: string;
  readonly files: readonly FileDiff[];
  readonly packageDependencies: DependencyDiff;
  readonly registryDependencies: DependencyDiff;
}

function localFileHash(cwd: string, relativePath: string): string | undefined {
  const absolute = resolve(cwd, relativePath);
  if (!existsSync(absolute)) {
    return undefined;
  }
  return hashContent(readFileSync(absolute));
}

function diffDependencies(
  previous: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>,
): DependencyDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: DependencyChange[] = [];

  for (const [name, version] of next) {
    const before = previous.get(name);
    if (before === undefined) {
      added.push(`${name}@${version}`);
    } else if (before !== version) {
      changed.push({ name, from: before, to: version });
    }
  }
  for (const [name, version] of previous) {
    if (!next.has(name)) {
      removed.push(`${name}@${version}`);
    }
  }

  return { added, removed, changed };
}

async function buildDiff(
  record: InstalledAssetRecord,
  plan: InstallationPlan,
  cwd: string,
  client: RegistryClient,
): Promise<DiffResult> {
  const versions = new Map(
    plan.resolvedAssets.map((resolved) => [resolved.id, resolved.version] as const),
  );
  const oldByPath = new Map(record.files.map((file) => [file.path, file] as const));
  const planByPath = new Map(plan.fileChanges.map((change) => [change.target, change] as const));
  const files: FileDiff[] = [];

  for (const change of plan.fileChanges) {
    const old = oldByPath.get(change.target);
    const current = localFileHash(cwd, change.target);
    let newSourceHash: string | undefined;
    try {
      const content = await client.getAssetFile(
        change.assetId,
        versions.get(change.assetId) ?? plan.version,
        change.source,
      );
      newSourceHash = hashContent(content);
    } catch {
      newSourceHash = undefined;
    }

    if (old === undefined) {
      files.push({
        path: change.target,
        status: 'added',
        localModified: false,
        registryChanged: true,
      });
      continue;
    }

    if (current === undefined) {
      files.push({
        path: change.target,
        status: 'deleted-locally',
        localModified: true,
        registryChanged: old.sourceHash !== newSourceHash,
      });
      continue;
    }

    const localModified = current !== old.hash;
    const registryChanged = newSourceHash !== undefined && old.sourceHash !== newSourceHash;

    let status: FileDiffStatus;
    if (localModified && registryChanged) {
      status = 'modified-both';
    } else if (localModified) {
      status = 'modified';
    } else if (registryChanged) {
      status = 'updated';
    } else {
      status = 'unchanged';
    }

    files.push({ path: change.target, status, localModified, registryChanged });
  }

  for (const old of record.files) {
    if (planByPath.has(old.path)) {
      continue;
    }
    const current = localFileHash(cwd, old.path);
    const localModified = current !== undefined && current !== old.hash;
    files.push({
      path: old.path,
      status: 'removed',
      localModified,
      registryChanged: true,
    });
  }

  const previousPackages = new Map(
    record.packageDependencies.map((dependency) => [dependency.name, dependency.version] as const),
  );
  const nextPackages = new Map(
    plan.packageDependencies.map((dependency) => [dependency.name, dependency.version] as const),
  );
  const previousRegistry = new Map(
    record.registryDependencies.map((dependency) => [dependency.id, dependency.version] as const),
  );
  const nextRegistry = new Map(
    plan.resolvedAssets
      .filter((resolved) => resolved.id !== plan.assetId)
      .map((resolved) => [resolved.id, resolved.version] as const),
  );

  return {
    assetId: plan.assetId,
    installedVersion: record.version,
    targetVersion: plan.version,
    files,
    packageDependencies: diffDependencies(previousPackages, nextPackages),
    registryDependencies: diffDependencies(previousRegistry, nextRegistry),
  };
}

function printDiff(result: DiffResult, json: boolean): void {
  info(`Diff for "${result.assetId}": ${result.installedVersion} -> ${result.targetVersion}`, json);

  info('Files:', json);
  if (result.files.length === 0) {
    info('  (no files)', json);
  }
  for (const file of result.files) {
    info(`  [${file.status}] ${file.path}`, json);
  }

  const { packageDependencies, registryDependencies } = result;
  const hasPackageChanges =
    packageDependencies.added.length > 0 ||
    packageDependencies.removed.length > 0 ||
    packageDependencies.changed.length > 0;
  if (hasPackageChanges) {
    info('Package dependencies:', json);
    for (const dependency of packageDependencies.added) {
      info(`  + ${dependency}`, json);
    }
    for (const dependency of packageDependencies.removed) {
      info(`  - ${dependency}`, json);
    }
    for (const change of packageDependencies.changed) {
      info(`  ~ ${change.name}: ${change.from} -> ${change.to}`, json);
    }
  }

  const hasRegistryChanges =
    registryDependencies.added.length > 0 ||
    registryDependencies.removed.length > 0 ||
    registryDependencies.changed.length > 0;
  if (hasRegistryChanges) {
    info('Registry dependencies:', json);
    for (const dependency of registryDependencies.added) {
      info(`  + ${dependency}`, json);
    }
    for (const dependency of registryDependencies.removed) {
      info(`  - ${dependency}`, json);
    }
    for (const change of registryDependencies.changed) {
      info(`  ~ ${change.name}: ${change.from} -> ${change.to}`, json);
    }
  }
}

export const diffCommand: Command = {
  name: 'diff',
  description: 'Compare an installed asset with a registry version.',
  options: [
    {
      name: 'version',
      type: 'string',
      description: 'Registry version to compare against (defaults to the latest).',
    },
  ],
  handler: async (context) => {
    const { args, options, json } = context;
    const assetId = args[0];
    if (!assetId) {
      throw new CliError(
        'Missing required argument: <assetId>. Usage: simplify diff <assetId> [options]',
        'MISSING_ARGUMENT',
      );
    }
    if (args.length > 1) {
      throw new CliError(
        `diff accepts a single asset ID. Unexpected arguments: ${args.slice(1).join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const version = parseOptionalString(options.version);
    const project = loadProjectContext();

    let lock: LockFile;
    try {
      lock = await readLockFile(project.cwd);
    } catch (error) {
      throw toCliError(error, 'LOCK_READ_FAILED');
    }

    const record = getInstalledAsset(lock, assetId);
    if (record === undefined) {
      throw new CliError(`Asset "${assetId}" is not installed.`, 'NOT_INSTALLED');
    }

    let plan: InstallationPlan;
    try {
      plan = await planInstallation(
        {
          assetId,
          ...(version !== undefined ? { version } : {}),
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
      throw toCliError(error, 'DIFF_PLAN_FAILED');
    }

    const registryRoot = project.config.registry?.url;
    const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
    const result = await buildDiff(record, plan, project.cwd, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    printDiff(result, json);
  },
};
