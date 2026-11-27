import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from './index.js';
import { info, warning, success, CliError } from '../cli.js';
import { assertSafePath, createBackup, safeWrite } from '../installation/index.js';
import {
  getInstalledAsset,
  hashContent,
  readLockFile,
  removeInstallation,
  writeLockFile,
  type InstalledAssetRecord,
  type LockFile,
  type LockedFile,
} from '../installation/lockfile.js';
import { loadProjectContext, toCliError } from './project-context.js';

type RemovalOutcome = 'removed' | 'preserved' | 'missing' | 'failed';

interface PackageRemoval {
  readonly name: string;
  readonly version: string;
  readonly field: string;
}

async function removeFile(cwd: string, file: LockedFile, force: boolean): Promise<RemovalOutcome> {
  try {
    assertSafePath(file.path, cwd);
  } catch {
    return 'failed';
  }

  const absolute = resolve(cwd, file.path);
  if (!existsSync(absolute)) {
    return 'missing';
  }

  try {
    const current = hashContent(readFileSync(absolute));
    if (!force && current !== file.hash) {
      return 'preserved';
    }
    await createBackup(absolute);
    unlinkSync(absolute);
    return 'removed';
  } catch {
    return 'failed';
  }
}

function collectPackageRemovals(
  record: InstalledAssetRecord,
  remaining: readonly InstalledAssetRecord[],
): PackageRemoval[] {
  const stillReferenced = new Set(
    remaining.flatMap((asset) => asset.packageDependencies.map((dependency) => dependency.name)),
  );
  return record.packageDependencies
    .filter((dependency) => !stillReferenced.has(dependency.name))
    .map((dependency) => ({ name: dependency.name, version: dependency.version, field: '' }));
}

function classifyOwnedFile(cwd: string, file: LockedFile, force: boolean): RemovalOutcome {
  const absolute = resolve(cwd, file.path);
  if (!existsSync(absolute)) {
    return 'missing';
  }
  if (force) {
    return 'removed';
  }
  return hashContent(readFileSync(absolute)) === file.hash ? 'removed' : 'preserved';
}

function findPackageField(
  manifest: Record<string, unknown>,
  name: string,
): { readonly field: string; readonly value: string } | undefined {
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const value = manifest[field];
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const map = value as Record<string, unknown>;
    if (typeof map[name] === 'string') {
      return { field, value: map[name] as string };
    }
  }
  return undefined;
}

async function removePackageDependencies(
  cwd: string,
  candidates: readonly PackageRemoval[],
  dryRun: boolean,
  json: boolean,
): Promise<void> {
  if (candidates.length === 0) {
    return;
  }

  const packageJsonPath = join(cwd, 'package.json');
  if (!existsSync(packageJsonPath)) {
    warning(
      `No package.json found; skipping package dependency removal for ${candidates
        .map((candidate) => candidate.name)
        .join(', ')}.`,
      json,
    );
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch {
    warning('package.json could not be parsed; skipping package dependency removal.', json);
    return;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    warning('package.json is not an object; skipping package dependency removal.', json);
    return;
  }

  const manifest = parsed as Record<string, unknown>;
  const removable: PackageRemoval[] = [];

  for (const candidate of candidates) {
    const located = findPackageField(manifest, candidate.name);
    if (located === undefined) {
      continue;
    }
    if (located.value !== candidate.version) {
      warning(
        `Keeping package "${candidate.name}" (${located.value}) because it differs from the installed version ${candidate.version}.`,
        json,
      );
      continue;
    }
    removable.push({ ...candidate, field: located.field });
  }

  if (removable.length === 0) {
    return;
  }

  for (const removal of removable) {
    info(`  Package dependency: ${removal.name}@${removal.version} (${removal.field})`, json);
  }

  if (dryRun) {
    return;
  }

  for (const removal of removable) {
    const fieldValue = manifest[removal.field];
    if (fieldValue !== null && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      delete (fieldValue as Record<string, unknown>)[removal.name];
    }
  }

  try {
    await safeWrite({
      targetPath: 'package.json',
      content: `${JSON.stringify(manifest, null, 2)}\n`,
      backup: true,
      cwd,
    });
  } catch (error) {
    throw toCliError(error, 'PACKAGE_UPDATE_FAILED');
  }
}

export const removeCommand: Command = {
  name: 'remove',
  description: 'Remove an installed asset from the current project.',
  options: [
    {
      name: 'force',
      type: 'boolean',
      description: 'Remove even when other assets depend on it or files were modified.',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show the removal plan without making changes.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, json } = context;
    const assetId = args[0];
    if (!assetId) {
      throw new CliError(
        'Missing required argument: <assetId>. Usage: simplify remove <assetId> [options]',
        'MISSING_ARGUMENT',
      );
    }
    if (args.length > 1) {
      throw new CliError(
        `remove accepts a single asset ID. Unexpected arguments: ${args.slice(1).join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const force = options.force === true;
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

    const dependents = lock.assets.filter(
      (asset) =>
        asset.id !== assetId &&
        asset.registryDependencies.some((dependency) => dependency.id === assetId),
    );
    if (dependents.length > 0 && !force) {
      throw new CliError(
        `Cannot remove "${assetId}": it is required by ${dependents
          .map((dependent) => dependent.id)
          .join(', ')}. Use --force to remove it anyway.`,
        'DEPENDENCY_CONFLICT',
      );
    }
    if (dependents.length > 0) {
      warning(
        `Removing "${assetId}" even though ${dependents
          .map((dependent) => dependent.id)
          .join(', ')} depend on it. Shared files will be preserved.`,
        json,
      );
    }

    const remainingAssets = lock.assets.filter((asset) => asset.id !== assetId);
    const sharedPaths = new Set(
      remainingAssets.flatMap((asset) => asset.files.map((file) => file.path)),
    );
    const ownedFiles = record.files.filter((file) => !sharedPaths.has(file.path));
    const packageRemovals = collectPackageRemovals(record, remainingAssets);

    info(`Removal plan for "${record.id}"@${record.version} (${record.mode}):`, json);
    info(`  Files: ${ownedFiles.length} owned file(s)`, json);
    const sharedCount = record.files.length - ownedFiles.length;
    if (sharedCount > 0) {
      info(`  Shared files preserved: ${sharedCount}`, json);
    }

    if (dryRun) {
      for (const file of ownedFiles) {
        const outcome = classifyOwnedFile(project.cwd, file, force);
        if (outcome === 'removed') {
          info(`  Would remove: ${file.path}`, json);
        } else if (outcome === 'preserved') {
          info(`  Would preserve (modified locally): ${file.path}`, json);
        }
      }
    }

    await removePackageDependencies(project.cwd, packageRemovals, dryRun, json);

    const preserved: string[] = [];
    const failed: string[] = [];

    if (!dryRun) {
      for (const file of ownedFiles) {
        const outcome = await removeFile(project.cwd, file, force);
        if (outcome === 'preserved') {
          preserved.push(file.path);
        } else if (outcome === 'failed') {
          failed.push(file.path);
        }
      }

      for (const path of preserved) {
        warning(
          `Preserved "${path}" because it was modified locally. Use --force to remove it.`,
          json,
        );
      }
      for (const path of failed) {
        warning(`Failed to remove "${path}".`, json);
      }

      try {
        await writeLockFile(removeInstallation(lock, assetId), project.cwd);
      } catch (error) {
        throw toCliError(error, 'LOCK_WRITE_FAILED');
      }
    }

    if (dryRun) {
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    if (failed.length > 0) {
      throw new CliError(
        `Removed "${assetId}" from the lock file but failed to delete ${failed.length} file(s): ${failed.join(', ')}.`,
        'REMOVAL_INCOMPLETE',
      );
    }

    success(`Removed "${assetId}".`, json);
  },
};
