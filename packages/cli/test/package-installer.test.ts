import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PackageInstaller } from '../src/installation/package-installer.js';
import type { PackageDependency } from '@simplify-dev/schemas';

const mockSpawn = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockStatSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    statSync: mockStatSync,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
  };
});

const PROJECT = '/test/project';
const existsMap = new Map<string, boolean>();
const readMap = new Map<string, string>();
const mtimeMap = new Map<string, number>();

beforeEach(() => {
  vi.resetAllMocks();
  existsMap.clear();
  readMap.clear();
  mtimeMap.clear();

  mockExistsSync.mockImplementation((path: unknown) => existsMap.get(String(path)) ?? false);
  mockReadFileSync.mockImplementation((path: unknown) => {
    const key = String(path);
    if (readMap.has(key)) {
      return readMap.get(key)!;
    }
    const error = new Error(`ENOENT: no such file, '${key}'`);
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  });
  mockStatSync.mockImplementation((path: unknown) => ({
    mtimeMs: mtimeMap.get(String(path)) ?? 0,
  }));
});

type Proc = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };

function createProc(): Proc {
  const proc = new EventEmitter() as Proc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

function setPackageJson(packageName: string, version: string): void {
  readMap.set(
    `${PROJECT}/package.json`,
    JSON.stringify({
      name: 'test-project',
      dependencies: { [packageName]: version },
    }),
  );
  existsMap.set(`${PROJECT}/package.json`, true);
}

function setConfig(packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun'): void {
  readMap.set(
    `${PROJECT}/simplify.config.json`,
    JSON.stringify({
      schemaVersion: 1,
      packageManager,
      installation: {
        defaultMode: 'hybrid',
        paths: {
          ui: '@/components/ui',
          blocks: '@/components/blocks',
          logic: '@/lib',
          integrations: '@/lib/integrations',
          hooks: '@/hooks',
          styles: '@/styles',
        },
      },
    }),
  );
  existsMap.set(`${PROJECT}/simplify.config.json`, true);
}

function lockfilePath(name: string): string {
  return `${PROJECT}/${name}`;
}

const baseOptions = {
  packageName: 'pkg',
  version: '1.0.0',
  cwd: PROJECT,
} as const;

function startInstall(
  installer: PackageInstaller,
  overrides: Record<string, unknown> = {},
): {
  promise: Promise<Awaited<ReturnType<PackageInstaller['install']>>>;
  proc: Proc;
} {
  const proc = createProc();
  mockSpawn.mockReturnValue(proc);
  const promise = installer.install({ ...baseOptions, ...overrides });
  return { promise, proc };
}

function emitClose(proc: Proc, code: number | null, signal: string | null): void {
  proc.stdout.emit('data', Buffer.from(''));
  proc.stderr.emit('data', Buffer.from(''));
  proc.emit('close', code, signal);
}

function spawnError(code: string): Error {
  const error = new Error(`spawn ${code} ENOENT`);
  (error as NodeJS.ErrnoException).code = code;
  return error;
}

describe('PackageInstaller', () => {
  describe('successful installs', () => {
    it('pnpm: installs package and respects lockfile', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      mtimeMap.set(lockfilePath('pnpm-lock.yaml'), 1000);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      mtimeMap.set(lockfilePath('pnpm-lock.yaml'), 2000);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn.mock.calls[0]![0]).toBe('pnpm');
      expect(mockSpawn.mock.calls[0]![1]).toEqual(['add', 'pkg@1.0.0']);
      expect(result.installed).toBe(true);
      expect(result.command).toBe('pnpm add pkg@1.0.0');
      expect(result.lockfileUpdated).toBe(true);
      expect(result.warnings).toBeUndefined();
    });

    it('npm: installs package', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('package-lock.json'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('npm');
      expect(mockSpawn.mock.calls[0]![1]).toEqual(['install', 'pkg@1.0.0']);
      expect(result.command).toBe('npm install pkg@1.0.0');
      expect(result.installed).toBe(true);
    });

    it('yarn: installs package', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('yarn.lock'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('yarn');
      expect(mockSpawn.mock.calls[0]![1]).toEqual(['add', 'pkg@1.0.0']);
      expect(result.command).toBe('yarn add pkg@1.0.0');
      expect(result.installed).toBe(true);
    });

    it('uses config-declared package manager', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      setConfig('npm');
      existsMap.set(lockfilePath('package-lock.json'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('npm');
      expect(result.command).toBe('npm install pkg@1.0.0');
    });

    it('records the installation in simplify metadata', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      await promise;

      const writeCall = mockWriteFileSync.mock.calls.find((call) =>
        String(call[0]).endsWith('package-installations.json'),
      );
      expect(writeCall).toBeDefined();
      expect(String(writeCall![0])).toContain('.simplify');
      const payload = JSON.parse(String(writeCall![1]));
      expect(payload).toHaveLength(1);
      expect(payload[0]).toMatchObject({
        packageName: 'pkg',
        version: '1.0.0',
        packageManager: 'pnpm',
        kind: 'runtime',
      });
    });
  });

  describe('optional dependencies', () => {
    it('skips optional dependencies and warns', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      setPackageJson('pkg', '1.0.0');

      const dependencies: readonly PackageDependency[] = [
        { name: 'react', version: '^18.0.0', kind: 'optional' },
        { name: 'lodash', version: '^4.17.0', kind: 'development' },
      ];

      const { promise, proc } = startInstall(installer, {
        packageDependencies: dependencies,
      });
      emitClose(proc, 0, null);
      const result = await promise;

      const args = mockSpawn.mock.calls[0]![1];
      expect(args).not.toContain('react@^18.0.0');
      expect(args).toContain('lodash@^4.17.0');
      expect(args).toContain('--save-dev');
      expect(result.command).toContain('lodash@^4.17.0');
      expect(result.command).not.toContain('react@^18.0.0');
      expect(result.warnings).toContain('Optional dependency skipped: react@^18.0.0');
    });

    it('does not add a save flag for runtime dependencies', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      setPackageJson('pkg', '1.0.0');

      const dependencies: readonly PackageDependency[] = [
        { name: 'react', version: '^18.0.0', kind: 'runtime' },
      ];

      const { promise, proc } = startInstall(installer, {
        packageDependencies: dependencies,
      });
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![1]).toEqual(['add', 'pkg@1.0.0', 'react@^18.0.0']);
      expect(result.command).not.toContain('--save-dev');
    });
  });

  describe('dry run', () => {
    it('shows command but does not execute', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);

      const { promise } = startInstall(installer, { dryRun: true });
      const result = await promise;

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(result.installed).toBe(false);
      expect(result.command).toBe('pnpm add pkg@1.0.0');
      expect(result.lockfileUpdated).toBe(false);
    });

    it('supports dry run as a constructor default', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT, dryRun: true });
      existsMap.set(lockfilePath('yarn.lock'), true);

      const result = await installer.install(baseOptions);

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(result.command).toBe('yarn add pkg@1.0.0');
    });
  });

  describe('errors', () => {
    it('throws PKG_MGR_NOT_FOUND when package manager binary is missing', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      const { promise, proc } = startInstall(installer);
      proc.emit('error', spawnError('ENOENT'));

      await expect(promise).rejects.toMatchObject({
        code: 'PKG_MGR_NOT_FOUND',
        name: 'PackageInstallerError',
      });
    });

    it('throws PKG_INSTALL_FAILED on non-zero exit', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      const { promise, proc } = startInstall(installer);
      proc.stderr.emit('data', Buffer.from('ERR! version not found'));
      proc.emit('close', 1, null);

      await expect(promise).rejects.toMatchObject({
        code: 'PKG_INSTALL_FAILED',
        name: 'PackageInstallerError',
      });
    });

    it('throws INTERRUPTED_INSTALL when process receives a signal', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      const { promise, proc } = startInstall(installer);
      proc.emit('close', null, 'SIGTERM');

      await expect(promise).rejects.toMatchObject({
        code: 'INTERRUPTED_INSTALL',
        name: 'PackageInstallerError',
      });
    });

    it('reports partial state when interrupted after package.json update', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      setPackageJson('pkg', '1.0.0');
      const { promise, proc } = startInstall(installer);
      proc.emit('close', null, 'SIGINT');

      await expect(promise).rejects.toMatchObject({
        code: 'INTERRUPTED_INSTALL',
        details: { partialState: true },
      });
    });

    it('throws UNSUPPORTED_PKG_MGR for bun declared in config', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      setConfig('bun');

      await expect(installer.install(baseOptions)).rejects.toMatchObject({
        code: 'UNSUPPORTED_PKG_MGR',
        name: 'PackageInstallerError',
      });
    });

    it('throws UNSUPPORTED_PKG_MGR for an explicit unsupported manager', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });

      await expect(
        installer.install({ ...baseOptions, packageManager: 'bun' }),
      ).rejects.toMatchObject({
        code: 'UNSUPPORTED_PKG_MGR',
        name: 'PackageInstallerError',
      });
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('throws LOCKFILE_CONFLICT when configured manager mismatches lockfile', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      setConfig('npm');
      existsMap.set(lockfilePath('yarn.lock'), true);

      await expect(installer.install(baseOptions)).rejects.toMatchObject({
        code: 'LOCKFILE_CONFLICT',
        name: 'PackageInstallerError',
      });
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('throws LOCKFILE_CONFLICT when multiple lockfiles are present', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      existsMap.set(lockfilePath('yarn.lock'), true);

      await expect(installer.install(baseOptions)).rejects.toMatchObject({
        code: 'LOCKFILE_CONFLICT',
        name: 'PackageInstallerError',
      });
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('throws INVALID_VERSION for an empty version', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });

      await expect(installer.install({ ...baseOptions, version: '   ' })).rejects.toMatchObject({
        code: 'INVALID_VERSION',
        name: 'PackageInstallerError',
      });
    });

    it('throws INVALID_PACKAGE_NAME for a malformed name', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });

      await expect(
        installer.install({ ...baseOptions, packageName: 'bad name' }),
      ).rejects.toMatchObject({
        code: 'INVALID_PACKAGE_NAME',
        name: 'PackageInstallerError',
      });
    });

    it('reports installed=false when package is not recorded in package.json', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('pnpm-lock.yaml'), true);
      existsMap.set(`${PROJECT}/package.json`, true);
      readMap.set(
        `${PROJECT}/package.json`,
        JSON.stringify({ name: 'test-project', dependencies: {} }),
      );

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(result.installed).toBe(false);
      expect(
        mockWriteFileSync.mock.calls.some((call) =>
          String(call[0]).endsWith('package-installations.json'),
        ),
      ).toBe(false);
    });
  });

  describe('package manager detection', () => {
    it('defaults to pnpm when no lockfile or config is present', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('pnpm');
      expect(result.command).toBe('pnpm add pkg@1.0.0');
      expect(result.warnings).toContain(
        'Package manager could not be determined; defaulting to pnpm.',
      );
    });

    it('detects npm from package-lock.json', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('package-lock.json'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('npm');
      expect(result.command).toBe('npm install pkg@1.0.0');
    });

    it('detects yarn from yarn.lock', async () => {
      const installer = new PackageInstaller({ cwd: PROJECT });
      existsMap.set(lockfilePath('yarn.lock'), true);
      setPackageJson('pkg', '1.0.0');

      const { promise, proc } = startInstall(installer);
      emitClose(proc, 0, null);
      const result = await promise;

      expect(mockSpawn.mock.calls[0]![0]).toBe('yarn');
      expect(result.command).toBe('yarn add pkg@1.0.0');
    });
  });
});
