import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageDependency, PackageDependencyKind } from '@simplify-dev/schemas';
import { loadConfig } from './config.js';

export type SupportedPackageManager = 'pnpm' | 'npm' | 'yarn';

export type PackageInstallerErrorCode =
  | 'PKG_MGR_NOT_FOUND'
  | 'PKG_INSTALL_FAILED'
  | 'INTERRUPTED_INSTALL'
  | 'LOCKFILE_CONFLICT'
  | 'UNSUPPORTED_PKG_MGR'
  | 'INVALID_PACKAGE_NAME'
  | 'INVALID_VERSION';

export interface PackageInstallerOptions {
  readonly packageName: string;
  readonly version: string;
  readonly packageManager?: SupportedPackageManager | 'bun' | 'unknown' | string;
  readonly cwd?: string;
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  readonly kind?: PackageDependencyKind;
  readonly packageDependencies?: readonly PackageDependency[];
}

export interface PackageInstallResult {
  readonly packageName: string;
  readonly version: string;
  readonly installed: boolean;
  readonly command: string;
  readonly lockfileUpdated: boolean;
  readonly warnings?: readonly string[];
}

interface SpawnResult {
  readonly code: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: NodeJS.ErrnoException;
}

interface InstallerDefaults {
  readonly cwd?: string;
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
}

interface ResolvedCommand {
  readonly binary: SupportedPackageManager;
  readonly args: readonly string[];
  readonly display: string;
}

interface MetadataEntry {
  readonly packageName: string;
  readonly version: string;
  readonly kind: PackageDependencyKind;
  readonly packageManager: SupportedPackageManager;
  readonly installedAt: string;
  readonly dependencies: readonly {
    readonly name: string;
    readonly version: string;
    readonly kind: PackageDependencyKind;
  }[];
}

const LOCKFILE_BY_PACKAGE_MANAGER: Record<SupportedPackageManager, string> = {
  pnpm: 'pnpm-lock.yaml',
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
};

const SUPPORTED_PACKAGE_MANAGERS: readonly SupportedPackageManager[] = ['pnpm', 'npm', 'yarn'];

const DEFAULT_PACKAGE_MANAGER: SupportedPackageManager = 'pnpm';

const SIMPLIFY_DIR = '.simplify';
const INSTALLATIONS_FILE = 'package-installations.json';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class PackageInstallerError extends Error {
  readonly code: PackageInstallerErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: PackageInstallerErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'PackageInstallerError';
    this.code = code;
    this.details = details ?? {};
  }
}

function isSupportedPackageManager(value: unknown): value is SupportedPackageManager {
  return SUPPORTED_PACKAGE_MANAGERS.includes(value as SupportedPackageManager);
}

function runCommand(binary: string, args: readonly string[], cwd: string): Promise<SpawnResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(binary, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', (error: Error) => {
      resolve({ code: null, signal: null, stdout, stderr, error });
    });
    proc.on('close', (code: number | null, signal: string | null) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

export class PackageInstaller {
  private readonly defaultCwd: string;
  private readonly defaultDryRun: boolean;
  private readonly defaultVerbose: boolean;

  constructor(options: InstallerDefaults = {}) {
    this.defaultCwd = options.cwd ?? process.cwd();
    this.defaultDryRun = options.dryRun ?? false;
    this.defaultVerbose = options.verbose ?? false;
  }

  async install(options: PackageInstallerOptions): Promise<PackageInstallResult> {
    const cwd = options.cwd ?? this.defaultCwd;
    const dryRun = options.dryRun ?? this.defaultDryRun;
    const verbose = options.verbose ?? this.defaultVerbose;

    assertValidPackageName(options.packageName);
    assertValidVersion(options.version);

    const warnings: string[] = [];
    const packageManager = this.resolvePackageManager(options.packageManager, cwd, warnings);

    const declaredDependencies = options.packageDependencies ?? [];
    const requiredDependencies = declaredDependencies.filter(
      (dependency) => dependency.kind !== 'optional',
    );
    for (const dependency of declaredDependencies) {
      if (dependency.kind === 'optional') {
        warnings.push(`Optional dependency skipped: ${dependency.name}@${dependency.version}`);
      }
    }

    const kind =
      options.kind ??
      (requiredDependencies.some((dependency) => dependency.kind === 'development')
        ? 'development'
        : 'runtime');

    const resolvedCommand = this.buildCommand(
      packageManager,
      options.packageName,
      options.version,
      requiredDependencies,
      kind,
    );

    if (verbose) {
      console.log(`[simplify:install] ${resolvedCommand.display}`);
    }

    if (dryRun) {
      return {
        packageName: options.packageName,
        version: options.version,
        installed: false,
        command: resolvedCommand.display,
        lockfileUpdated: false,
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    }

    const lockfileName = LOCKFILE_BY_PACKAGE_MANAGER[packageManager];
    const lockfilePath = join(cwd, lockfileName);
    const lockfileExistedBefore = existsSync(lockfilePath);
    const lockfileMtimeBefore = lockfileExistedBefore ? statSync(lockfilePath).mtimeMs : null;

    const spawnResult = await runCommand(resolvedCommand.binary, resolvedCommand.args, cwd);

    if (spawnResult.error !== undefined) {
      if (spawnResult.error.code === 'ENOENT') {
        throw new PackageInstallerError(
          'PKG_MGR_NOT_FOUND',
          `Package manager "${packageManager}" is not installed or not available on PATH.`,
          { packageManager, cwd, command: resolvedCommand.display },
        );
      }
      throw new PackageInstallerError(
        'PKG_INSTALL_FAILED',
        `Failed to execute package manager "${packageManager}": ${spawnResult.error.message}`,
        {
          packageManager,
          cwd,
          command: resolvedCommand.display,
          errorCode: spawnResult.error.code,
        },
      );
    }

    if (spawnResult.signal !== null) {
      const partialState = this.isDependencyRecorded(cwd, options.packageName);
      throw new PackageInstallerError(
        'INTERRUPTED_INSTALL',
        `Installation of "${options.packageName}@${options.version}" was interrupted (signal: ${spawnResult.signal}).${
          partialState
            ? ` The package may be partially recorded in package.json; review and re-run the installation.`
            : ''
        }`,
        {
          packageManager,
          packageName: options.packageName,
          version: options.version,
          signal: spawnResult.signal,
          cwd,
          partialState,
          command: resolvedCommand.display,
        },
      );
    }

    if (spawnResult.code !== 0) {
      const partialState = this.isDependencyRecorded(cwd, options.packageName);
      const stderrDetail = spawnResult.stderr.trim();
      throw new PackageInstallerError(
        'PKG_INSTALL_FAILED',
        `Failed to install "${options.packageName}@${options.version}" with "${packageManager}" (exit code ${spawnResult.code}).${
          stderrDetail.length > 0 ? ` ${stderrDetail}` : ''
        }`,
        {
          packageManager,
          packageName: options.packageName,
          version: options.version,
          exitCode: spawnResult.code,
          stderr: spawnResult.stderr,
          cwd,
          partialState,
          command: resolvedCommand.display,
        },
      );
    }

    const lockfileUpdated = this.isLockfileUpdated(
      lockfilePath,
      lockfileExistedBefore,
      lockfileMtimeBefore,
    );

    const installed = this.isDependencyRecorded(cwd, options.packageName);

    if (installed) {
      this.recordInstallation({
        cwd,
        packageName: options.packageName,
        version: options.version,
        kind,
        packageManager,
        dependencies: requiredDependencies,
      });
    }

    return {
      packageName: options.packageName,
      version: options.version,
      installed,
      command: resolvedCommand.display,
      lockfileUpdated,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  private resolvePackageManager(
    requested: string | undefined,
    cwd: string,
    warnings: string[],
  ): SupportedPackageManager {
    if (requested !== undefined && requested !== 'unknown') {
      if (!isSupportedPackageManager(requested)) {
        throw new PackageInstallerError(
          'UNSUPPORTED_PKG_MGR',
          `Package manager "${requested}" is not supported. Supported package managers: ${SUPPORTED_PACKAGE_MANAGERS.join(', ')}.`,
          { packageManager: requested, supported: SUPPORTED_PACKAGE_MANAGERS },
        );
      }
      this.assertNoLockfileConflict(requested, cwd);
      return requested;
    }

    let configManager: SupportedPackageManager | undefined;
    try {
      const config = loadConfig(cwd);
      const declared = config.packageManager;
      if (declared !== undefined) {
        if (!isSupportedPackageManager(declared)) {
          throw new PackageInstallerError(
            'UNSUPPORTED_PKG_MGR',
            `Package manager "${declared}" declared in simplify.config.json is not supported. Supported package managers: ${SUPPORTED_PACKAGE_MANAGERS.join(', ')}.`,
            {
              packageManager: declared,
              supported: SUPPORTED_PACKAGE_MANAGERS,
            },
          );
        }
        configManager = declared;
      }
    } catch (error) {
      if (error instanceof PackageInstallerError) {
        throw error;
      }
      // No usable configuration; fall through to lockfile detection.
    }

    if (configManager !== undefined) {
      this.assertNoLockfileConflict(configManager, cwd);
      return configManager;
    }

    const detected = SUPPORTED_PACKAGE_MANAGERS.filter((packageManager) =>
      existsSync(join(cwd, LOCKFILE_BY_PACKAGE_MANAGER[packageManager])),
    );

    if (detected.length > 1) {
      throw new PackageInstallerError(
        'LOCKFILE_CONFLICT',
        `Multiple lockfiles detected (${detected
          .map((packageManager) => LOCKFILE_BY_PACKAGE_MANAGER[packageManager])
          .join(', ')}). Specify a package manager explicitly to resolve the conflict.`,
        {
          lockfiles: detected.map((packageManager) => LOCKFILE_BY_PACKAGE_MANAGER[packageManager]),
        },
      );
    }

    if (detected.length === 1) {
      return detected[0]!;
    }

    warnings.push(
      `Package manager could not be determined; defaulting to ${DEFAULT_PACKAGE_MANAGER}.`,
    );
    return DEFAULT_PACKAGE_MANAGER;
  }

  private assertNoLockfileConflict(packageManager: SupportedPackageManager, cwd: string): void {
    const ownLockfile = LOCKFILE_BY_PACKAGE_MANAGER[packageManager];
    if (existsSync(join(cwd, ownLockfile))) {
      return;
    }

    const conflicting = SUPPORTED_PACKAGE_MANAGERS.filter(
      (candidate) =>
        candidate !== packageManager &&
        existsSync(join(cwd, LOCKFILE_BY_PACKAGE_MANAGER[candidate])),
    );

    if (conflicting.length > 0) {
      throw new PackageInstallerError(
        'LOCKFILE_CONFLICT',
        `Package manager "${packageManager}" was selected but ${conflicting
          .map((candidate) => LOCKFILE_BY_PACKAGE_MANAGER[candidate])
          .join(
            ', ',
          )} is present. Remove the conflicting lockfile or select the matching package manager.`,
        {
          packageManager,
          expectedLockfile: ownLockfile,
          conflictingLockfiles: conflicting.map(
            (candidate) => LOCKFILE_BY_PACKAGE_MANAGER[candidate],
          ),
        },
      );
    }
  }

  private buildCommand(
    packageManager: SupportedPackageManager,
    packageName: string,
    version: string,
    dependencies: readonly PackageDependency[],
    kind: PackageDependencyKind,
  ): ResolvedCommand {
    const subcommand = packageManager === 'npm' ? 'install' : 'add';

    const specs = [
      `${packageName}@${version}`,
      ...dependencies.map((dependency) => `${dependency.name}@${dependency.version}`),
    ];

    const args = [subcommand, ...specs];

    if (kind === 'development') {
      args.push(packageManager === 'yarn' ? '-D' : '--save-dev');
    }

    return {
      binary: packageManager,
      args,
      display: `${packageManager} ${args.join(' ')}`,
    };
  }

  private isLockfileUpdated(
    lockfilePath: string,
    existedBefore: boolean,
    mtimeBefore: number | null,
  ): boolean {
    if (!existsSync(lockfilePath)) {
      return false;
    }
    if (!existedBefore || mtimeBefore === null) {
      return true;
    }
    return statSync(lockfilePath).mtimeMs !== mtimeBefore;
  }

  private isDependencyRecorded(cwd: string, packageName: string): boolean {
    const packageJsonPath = join(cwd, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return false;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    } catch {
      return false;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }

    const manifest = parsed as Record<string, unknown>;
    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = manifest[field];
      if (
        dependencies !== null &&
        typeof dependencies === 'object' &&
        !Array.isArray(dependencies)
      ) {
        if (packageName in (dependencies as Record<string, unknown>)) {
          return true;
        }
      }
    }

    return false;
  }

  private recordInstallation(options: {
    readonly cwd: string;
    readonly packageName: string;
    readonly version: string;
    readonly kind: PackageDependencyKind;
    readonly packageManager: SupportedPackageManager;
    readonly dependencies: readonly PackageDependency[];
  }): void {
    const { cwd, packageName, version, kind, packageManager, dependencies } = options;

    const directory = join(cwd, SIMPLIFY_DIR);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    const filePath = join(directory, INSTALLATIONS_FILE);
    const entries: MetadataEntry[] = [];

    if (existsSync(filePath)) {
      try {
        const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
        if (Array.isArray(parsed)) {
          entries.push(...(parsed as MetadataEntry[]));
        }
      } catch {
        // Corrupt metadata file; start fresh.
      }
    }

    const entry: MetadataEntry = {
      packageName,
      version,
      kind,
      packageManager,
      installedAt: new Date().toISOString(),
      dependencies: dependencies.map((dependency) => ({
        name: dependency.name,
        version: dependency.version,
        kind: dependency.kind,
      })),
    };

    const existingIndex = entries.findIndex((existing) => existing.packageName === packageName);
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    writeFileSync(filePath, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  }
}

function assertValidPackageName(packageName: string): void {
  if (
    typeof packageName !== 'string' ||
    packageName.length === 0 ||
    hasControlCharacters(packageName) ||
    !PACKAGE_NAME_PATTERN.test(packageName)
  ) {
    throw new PackageInstallerError(
      'INVALID_PACKAGE_NAME',
      `Invalid package name: "${packageName}". Expected an npm package name such as "react" or "@scope/name".`,
      { packageName },
    );
  }
}

function assertValidVersion(version: string): void {
  if (typeof version !== 'string' || version.trim().length === 0 || hasControlCharacters(version)) {
    throw new PackageInstallerError(
      'INVALID_VERSION',
      `Invalid version or version range: "${version}".`,
      { version },
    );
  }
}
