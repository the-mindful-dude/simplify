import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ConfigurationChange,
  InstallationMode,
  PackageDependency,
} from '@simplify-dev/schemas';
import { safeWrite } from './safe-write.js';

export const LOCK_SCHEMA_VERSION = 1;
export const LOCK_DIRECTORY = '.simplify';
export const LOCK_FILE_NAME = 'lock.json';
export const LOCK_FILE_PATH = `${LOCK_DIRECTORY}/${LOCK_FILE_NAME}`;

const INSTALLATION_MODES: readonly InstallationMode[] = ['package', 'source', 'hybrid'];
const CONFIG_FORMATS: readonly ConfigurationChange['format'][] = [
  'json',
  'jsonc',
  'env',
  'typescript',
];
const CONFIG_OPERATIONS: readonly ConfigurationChange['operation'][] = ['merge', 'append-example'];
const PACKAGE_KINDS: readonly PackageDependency['kind'][] = [
  'runtime',
  'peer',
  'optional',
  'development',
];

export type LockFileErrorCode = 'LOCK_READ_FAILED' | 'LOCK_INVALID' | 'LOCK_WRITE_FAILED';

export class LockFileError extends Error {
  readonly code: LockFileErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: LockFileErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'LockFileError';
    this.code = code;
    this.details = details ?? {};
  }
}

export interface LockedFile {
  readonly path: string;
  readonly hash: string;
  readonly sourceHash: string;
  readonly assetId: string;
  readonly source: string;
}

export interface LockedRegistryDependency {
  readonly id: string;
  readonly version: string;
}

export interface LockedPackageDependency {
  readonly name: string;
  readonly version: string;
  readonly kind: PackageDependency['kind'];
}

export interface LockedConfigChange {
  readonly file: string;
  readonly format: ConfigurationChange['format'];
  readonly operation: ConfigurationChange['operation'];
}

export interface InstalledAssetRecord {
  readonly id: string;
  readonly version: string;
  readonly mode: InstallationMode;
  readonly installedAt: string;
  readonly files: readonly LockedFile[];
  readonly packageDependencies: readonly LockedPackageDependency[];
  readonly registryDependencies: readonly LockedRegistryDependency[];
  readonly configChanges: readonly LockedConfigChange[];
}

export interface LockFile {
  readonly schemaVersion: number;
  readonly assets: readonly InstalledAssetRecord[];
}

export function createEmptyLockFile(): LockFile {
  return { schemaVersion: LOCK_SCHEMA_VERSION, assets: [] };
}

export function hashContent(content: string | Uint8Array): string {
  const buffer =
    typeof content === 'string'
      ? Buffer.from(content, 'utf8')
      : Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  return createHash('sha256').update(buffer).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function invalid(message: string, details?: Readonly<Record<string, unknown>>): never {
  throw new LockFileError('LOCK_INVALID', message, details);
}

function parseFile(value: unknown, index: number): LockedFile {
  if (!isRecord(value)) {
    return invalid(`Lock file entry assets[${index}] contains an invalid file record.`);
  }
  const { path, hash, sourceHash, assetId, source } = value;
  if (
    !isString(path) ||
    !isString(hash) ||
    !isString(sourceHash) ||
    !isString(assetId) ||
    !isString(source)
  ) {
    return invalid(`Lock file entry assets[${index}] contains an invalid file record.`);
  }
  return { path, hash, sourceHash, assetId, source };
}

function parseRegistryDependency(value: unknown, index: number): LockedRegistryDependency {
  if (!isRecord(value) || !isString(value.id) || !isString(value.version)) {
    return invalid(
      `Lock file entry assets[${index}] contains an invalid registry dependency record.`,
    );
  }
  return { id: value.id, version: value.version };
}

function parsePackageDependency(value: unknown, index: number): LockedPackageDependency {
  if (!isRecord(value) || !isString(value.name) || !isString(value.version)) {
    return invalid(
      `Lock file entry assets[${index}] contains an invalid package dependency record.`,
    );
  }
  const kind = value.kind;
  if (!isString(kind) || !PACKAGE_KINDS.includes(kind as PackageDependency['kind'])) {
    return invalid(
      `Lock file entry assets[${index}] contains an invalid package dependency kind.`,
      { kind },
    );
  }
  return { name: value.name, version: value.version, kind: kind as PackageDependency['kind'] };
}

function parseConfigChange(value: unknown, index: number): LockedConfigChange {
  if (
    !isRecord(value) ||
    !isString(value.file) ||
    !isString(value.format) ||
    !isString(value.operation)
  ) {
    return invalid(`Lock file entry assets[${index}] contains an invalid config change record.`);
  }
  if (!CONFIG_FORMATS.includes(value.format as ConfigurationChange['format'])) {
    return invalid(`Lock file entry assets[${index}] contains an invalid config format.`, {
      format: value.format,
    });
  }
  if (!CONFIG_OPERATIONS.includes(value.operation as ConfigurationChange['operation'])) {
    return invalid(`Lock file entry assets[${index}] contains an invalid config operation.`, {
      operation: value.operation,
    });
  }
  return {
    file: value.file,
    format: value.format as ConfigurationChange['format'],
    operation: value.operation as ConfigurationChange['operation'],
  };
}

function parseAsset(value: unknown, index: number): InstalledAssetRecord {
  if (!isRecord(value)) {
    return invalid(`Lock file entry assets[${index}] is not an object.`);
  }
  const { id, version, mode, installedAt } = value;
  if (!isString(id) || !isString(version) || !isString(mode) || !isString(installedAt)) {
    return invalid(`Lock file entry assets[${index}] is missing required fields.`);
  }
  if (!INSTALLATION_MODES.includes(mode as InstallationMode)) {
    return invalid(`Lock file entry assets[${index}] has an invalid installation mode.`, { mode });
  }
  if (!Array.isArray(value.files)) {
    return invalid(`Lock file entry assets[${index}] is missing a files array.`);
  }
  if (!Array.isArray(value.packageDependencies)) {
    return invalid(`Lock file entry assets[${index}] is missing a packageDependencies array.`);
  }
  if (!Array.isArray(value.registryDependencies)) {
    return invalid(`Lock file entry assets[${index}] is missing a registryDependencies array.`);
  }
  if (!Array.isArray(value.configChanges)) {
    return invalid(`Lock file entry assets[${index}] is missing a configChanges array.`);
  }

  return {
    id,
    version,
    mode: mode as InstallationMode,
    installedAt,
    files: value.files.map((file, fileIndex) => parseFile(file, fileIndex)),
    packageDependencies: value.packageDependencies.map((dependency, dependencyIndex) =>
      parsePackageDependency(dependency, dependencyIndex),
    ),
    registryDependencies: value.registryDependencies.map((dependency, dependencyIndex) =>
      parseRegistryDependency(dependency, dependencyIndex),
    ),
    configChanges: value.configChanges.map((change, changeIndex) =>
      parseConfigChange(change, changeIndex),
    ),
  };
}

export function parseLockFile(value: unknown): LockFile {
  if (!isRecord(value)) {
    return invalid('Lock file must contain a JSON object.');
  }
  if (value.schemaVersion !== LOCK_SCHEMA_VERSION) {
    return invalid(
      `Unsupported lock file schema version: ${String(value.schemaVersion)}. Expected ${LOCK_SCHEMA_VERSION}.`,
      { schemaVersion: value.schemaVersion },
    );
  }
  if (!Array.isArray(value.assets)) {
    return invalid('Lock file must contain an assets array.');
  }
  const assets = value.assets.map((asset, index) => parseAsset(asset, index));
  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.id)) {
      return invalid(`Lock file contains duplicate asset "${asset.id}".`, { assetId: asset.id });
    }
    ids.add(asset.id);
  }
  return { schemaVersion: LOCK_SCHEMA_VERSION, assets };
}

export function lockFileExists(cwd: string = process.cwd()): boolean {
  return existsSync(join(cwd, LOCK_FILE_PATH));
}

export async function readLockFile(cwd: string = process.cwd()): Promise<LockFile> {
  const filePath = join(cwd, LOCK_FILE_PATH);
  if (!existsSync(filePath)) {
    return createEmptyLockFile();
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new LockFileError(
      'LOCK_READ_FAILED',
      `Failed to read lock file "${LOCK_FILE_PATH}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      { filePath },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LockFileError('LOCK_INVALID', `Lock file "${LOCK_FILE_PATH}" is not valid JSON.`, {
      filePath,
    });
  }

  return parseLockFile(parsed);
}

function sortFiles(files: readonly LockedFile[]): LockedFile[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

function sortPackageDependencies(
  dependencies: readonly LockedPackageDependency[],
): LockedPackageDependency[] {
  return [...dependencies].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  );
}

function sortRegistryDependencies(
  dependencies: readonly LockedRegistryDependency[],
): LockedRegistryDependency[] {
  return [...dependencies].sort(
    (a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version),
  );
}

function sortConfigChanges(changes: readonly LockedConfigChange[]): LockedConfigChange[] {
  return [...changes].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.operation.localeCompare(b.operation) ||
      a.format.localeCompare(b.format),
  );
}

function normalizeAsset(asset: InstalledAssetRecord): InstalledAssetRecord {
  return {
    id: asset.id,
    version: asset.version,
    mode: asset.mode,
    installedAt: asset.installedAt,
    files: sortFiles(asset.files),
    packageDependencies: sortPackageDependencies(asset.packageDependencies),
    registryDependencies: sortRegistryDependencies(asset.registryDependencies),
    configChanges: sortConfigChanges(asset.configChanges),
  };
}

export function normalizeLockFile(lock: LockFile): LockFile {
  return {
    schemaVersion: LOCK_SCHEMA_VERSION,
    assets: [...lock.assets]
      .map((asset) => normalizeAsset(asset))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function serializeLockFile(lock: LockFile): string {
  return `${JSON.stringify(normalizeLockFile(lock), null, 2)}\n`;
}

export async function writeLockFile(lock: LockFile, cwd: string = process.cwd()): Promise<void> {
  const content = serializeLockFile(lock);
  try {
    await safeWrite({ targetPath: LOCK_FILE_PATH, content, cwd });
  } catch (error) {
    throw new LockFileError(
      'LOCK_WRITE_FAILED',
      `Failed to write lock file "${LOCK_FILE_PATH}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      { filePath: LOCK_FILE_PATH },
    );
  }
}

export function getInstalledAssets(lock: LockFile): readonly InstalledAssetRecord[] {
  return lock.assets;
}

export function getInstalledAsset(
  lock: LockFile,
  assetId: string,
): InstalledAssetRecord | undefined {
  return lock.assets.find((asset) => asset.id === assetId);
}

export function recordInstallation(lock: LockFile, record: InstalledAssetRecord): LockFile {
  const assets = lock.assets.filter((asset) => asset.id !== record.id);
  assets.push(record);
  return normalizeLockFile({ schemaVersion: LOCK_SCHEMA_VERSION, assets });
}

export function removeInstallation(lock: LockFile, assetId: string): LockFile {
  return normalizeLockFile({
    schemaVersion: LOCK_SCHEMA_VERSION,
    assets: lock.assets.filter((asset) => asset.id !== assetId),
  });
}
