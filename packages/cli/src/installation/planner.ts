import {
  RegistryClient,
  DependencyResolver,
  type ResolutionResult,
  type InstallationMode,
} from '@simplify-dev/registry';
import type { AssetManifest, ProjectConfiguration } from '@simplify-dev/schemas';
import type { ProjectDetectionResult } from '../detection/types.js';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve as resolvePath, isAbsolute, sep } from 'node:path';
import type { FileChange, FileConflictStatus, InstallationPlan, PlannerOptions } from './types.js';

export class InstallationPlanError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'InstallationPlanError';
    this.code = code;
    this.details = details ?? {};
  }
}

const ASSET_ID_PATTERN = /^(ui|blocks|logic|integrations|recipes|templates)\/[a-z0-9][a-z0-9-]*$/;

function isSafeRelativePath(value: string): boolean {
  if (isAbsolute(value)) {
    return false;
  }
  if (/^[A-Za-z]:/.test(value)) {
    return false;
  }
  return !value.split(/[\\/]+/).includes('..');
}

function isPathWithinRoot(targetPath: string, projectRoot: string): boolean {
  const normalizedRoot = resolvePath(projectRoot);
  const normalizedTarget = resolvePath(normalizedRoot, targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + sep);
}

async function checkFileStatus(
  targetPath: string,
  sourcePath: string,
  assetId: string,
  version: string,
  client: RegistryClient,
  projectRoot: string,
): Promise<FileConflictStatus> {
  const fullPath = resolvePath(projectRoot, targetPath);

  if (!isPathWithinRoot(targetPath, projectRoot)) {
    return 'user-owned';
  }

  if (!existsSync(fullPath)) {
    return 'new';
  }

  try {
    const existingContent = readFileSync(fullPath);
    const registryContent = await client.getAssetFile(assetId, version, sourcePath);
    const existingHash = createHash('sha256').update(existingContent).digest('hex');
    const registryHash = createHash('sha256').update(registryContent).digest('hex');
    if (existingHash === registryHash) {
      return 'unchanged';
    }
    return 'modified';
  } catch {
    return 'user-owned';
  }
}

function selectInstallationMode(
  asset: AssetManifest,
  requestedMode: InstallationMode | undefined,
  configDefault: InstallationMode,
): InstallationMode {
  if (requestedMode) {
    const supported = asset.installation?.modes?.some(
      (m: { mode: InstallationMode }) => m.mode === requestedMode,
    );
    if (!supported) {
      const supportedModes =
        asset.installation?.modes?.map((m: { mode: InstallationMode }) => m.mode) ?? [];
      throw new InstallationPlanError(
        'UNSUPPORTED_MODE',
        `Installation mode "${requestedMode}" is not supported by asset "${asset.id}". Supported modes: ${supportedModes.length > 0 ? supportedModes.join(', ') : 'none'}`,
        { assetId: asset.id, requestedMode, supportedModes },
      );
    }
    return requestedMode;
  }

  const modes = asset.installation?.modes ?? [];
  if (modes.length > 0) {
    const defaultSupported = modes.some(
      (m: { mode: InstallationMode }) => m.mode === configDefault,
    );
    if (defaultSupported) {
      return configDefault;
    }
    return modes[0]!.mode;
  }

  return configDefault;
}

export async function planInstallation(
  options: PlannerOptions,
  projectConfig: ProjectConfiguration,
  detectionResult: ProjectDetectionResult,
): Promise<InstallationPlan> {
  const {
    assetId,
    version: requestedVersion,
    mode: requestedMode,
    dryRun = false,
    targetPath,
    cwd,
  } = options;
  const projectRoot = cwd ?? process.cwd();

  void detectionResult;

  if (!ASSET_ID_PATTERN.test(assetId)) {
    throw new InstallationPlanError(
      'INVALID_ASSET_ID',
      `Invalid asset ID: "${assetId}". Expected "<category>/<name>".`,
      { assetId },
    );
  }

  if (targetPath !== undefined && !isSafeRelativePath(targetPath)) {
    throw new InstallationPlanError(
      'UNSAFE_PATH',
      `Unsafe target path: "${targetPath}". Paths must be relative and stay within the project root.`,
      { targetPath },
    );
  }

  const registryRoot = projectConfig.registry?.url;
  const client = new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});
  const asset = await client.getAsset(assetId, requestedVersion);
  if (asset === null) {
    throw new InstallationPlanError(
      'ASSET_NOT_FOUND',
      `Asset not found: "${assetId}"${requestedVersion === undefined ? '' : ` @${requestedVersion}`}.`,
      { assetId, version: requestedVersion },
    );
  }

  const configDefault = projectConfig.installation.defaultMode;
  const installationMode = selectInstallationMode(asset, requestedMode, configDefault);

  const supportedModes =
    asset.installation?.modes?.map((m: { mode: InstallationMode }) => m.mode) ?? [];
  if (supportedModes.length > 0 && !supportedModes.includes(installationMode)) {
    throw new InstallationPlanError(
      'UNSUPPORTED_MODE',
      `Installation mode "${installationMode}" is not supported by asset "${assetId}".`,
      { assetId, requestedMode: installationMode, supportedModes },
    );
  }

  const loadAsset = async (id: string, version?: string) =>
    (await client.getAsset(id, version)) ?? undefined;
  const resolver = new DependencyResolver(loadAsset, {
    defaultMode: installationMode,
  });

  let resolutionResult: ResolutionResult;
  try {
    resolutionResult = await resolver.resolve([assetId], projectConfig);
  } catch (err) {
    if (err instanceof InstallationPlanError) {
      throw err;
    }
    if (err instanceof Error && typeof (err as unknown as { code?: string }).code === 'string') {
      const resolverErr = err as unknown as {
        code: string;
        message: string;
        details?: Readonly<Record<string, unknown>>;
      };
      if (resolverErr.code === 'CYCLE_DETECTED') {
        throw new InstallationPlanError('CYCLE_DETECTED', resolverErr.message, resolverErr.details);
      }
      if (resolverErr.code === 'DUPLICATE_FILE_TARGET') {
        throw new InstallationPlanError(
          'DUPLICATE_FILE_TARGET',
          resolverErr.message,
          resolverErr.details,
        );
      }
      if (resolverErr.code === 'MISSING_ASSET') {
        throw new InstallationPlanError(
          'MISSING_DEPENDENCY',
          resolverErr.message,
          resolverErr.details,
        );
      }
    }
    throw err;
  }

  const modeDefinition = asset.installation?.modes?.find(
    (m: { mode: InstallationMode }) => m.mode === installationMode,
  );

  const fileChanges: FileChange[] = [];
  const seenTargets = new Set<string>();
  const assetVersions = new Map(
    resolutionResult.assets.map((resolved) => [resolved.id, resolved.version] as const),
  );

  for (const mapping of resolutionResult.fileMappings) {
    if (!isSafeRelativePath(mapping.source)) {
      throw new InstallationPlanError('UNSAFE_PATH', `Unsafe source path: "${mapping.source}".`, {
        source: mapping.source,
        assetId: mapping.assetId,
      });
    }
    if (!isSafeRelativePath(mapping.target)) {
      throw new InstallationPlanError('UNSAFE_PATH', `Unsafe target path: "${mapping.target}".`, {
        target: mapping.target,
        assetId: mapping.assetId,
      });
    }

    if (seenTargets.has(mapping.target)) {
      throw new InstallationPlanError(
        'DUPLICATE_FILE_TARGET',
        `Duplicate file target "${mapping.target}".`,
        { target: mapping.target, assetId: mapping.assetId },
      );
    }
    seenTargets.add(mapping.target);

    const status = await checkFileStatus(
      mapping.target,
      mapping.source,
      mapping.assetId,
      assetVersions.get(mapping.assetId) ?? asset.version,
      client,
      projectRoot,
    );

    fileChanges.push({
      source: mapping.source,
      target: mapping.target,
      assetId: mapping.assetId,
      status,
      exists: status !== 'new',
    });
  }

  return {
    assetId,
    version: asset.version,
    installationMode,
    resolvedAssets: resolutionResult.assets,
    fileChanges,
    packageDependencies: resolutionResult.packageDependencies,
    environmentVariables: resolutionResult.environmentVariables,
    configurationChanges: resolutionResult.configurationChanges,
    setupSteps: modeDefinition?.setup ?? [],
    dryRun,
  };
}
