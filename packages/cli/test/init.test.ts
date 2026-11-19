import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../src/cli.js';
import { CONFIG_FILE_NAME, validateConfig } from '../src/installation/config.js';
import { LOCK_FILE_PATH, readLockFile } from '../src/installation/lockfile.js';

let projectDir: string;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let cwdSpy: ReturnType<typeof vi.spyOn>;

function configPath(): string {
  return join(projectDir, CONFIG_FILE_NAME);
}

function lockPath(): string {
  return join(projectDir, LOCK_FILE_PATH);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function createProjectPackage(manager: 'npm' | 'pnpm' = 'npm'): void {
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'init-fixture', private: true }, null, 2),
    'utf8',
  );
  writeFileSync(
    join(projectDir, manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'),
    manager === 'npm' ? '{"lockfileVersion":3}\n' : "lockfileVersion: '9.0'\n",
    'utf8',
  );
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'simplify-init-'));
  cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cwdSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
  rmSync(projectDir, { recursive: true, force: true });
});

describe('init command', () => {
  it('creates a valid config and an empty lockfile in the project root', async () => {
    createProjectPackage('npm');

    const code = await run(['init']);

    expect(code).toBe(0);
    expect(existsSync(configPath())).toBe(true);
    const config = readJson(configPath());
    expect(validateConfig(config).valid).toBe(true);
    expect(config).toMatchObject({
      schemaVersion: 1,
      packageManager: 'npm',
      installation: { defaultMode: 'hybrid' },
    });

    expect(existsSync(lockPath())).toBe(true);
    expect(readJson(lockPath())).toEqual({ schemaVersion: 1, assets: [] });
    expect(await readLockFile(projectDir)).toEqual({ schemaVersion: 1, assets: [] });
  });

  it('writes no files in dry-run mode', async () => {
    createProjectPackage();

    const code = await run(['init', '--dry-run']);

    expect(code).toBe(0);
    expect(existsSync(configPath())).toBe(false);
    expect(existsSync(lockPath())).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(CONFIG_FILE_NAME));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(LOCK_FILE_PATH));
  });

  it('preserves an existing config and creates a missing lockfile', async () => {
    createProjectPackage();
    const existingConfig = JSON.stringify({
      schemaVersion: 1,
      packageManager: 'yarn',
      installation: { defaultMode: 'package' },
    });
    writeFileSync(configPath(), existingConfig, 'utf8');

    const code = await run(['init']);

    expect(code).toBe(0);
    expect(readFileSync(configPath(), 'utf8')).toBe(existingConfig);
    expect(existsSync(lockPath())).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('preserves an existing lockfile with installed assets', async () => {
    createProjectPackage();
    const existingLock = JSON.stringify(
      {
        schemaVersion: 1,
        assets: [
          {
            id: 'ui/button',
            version: '1.0.0',
            mode: 'package',
            installedAt: '2026-01-01T00:00:00.000Z',
            files: [],
            packageDependencies: [],
            registryDependencies: [],
            configChanges: [],
          },
        ],
      },
      null,
      2,
    );
    mkdirSync(join(projectDir, '.simplify'), { recursive: true });
    writeFileSync(lockPath(), existingLock, 'utf8');

    const code = await run(['init']);

    expect(code).toBe(0);
    expect(existsSync(configPath())).toBe(true);
    expect(readFileSync(lockPath(), 'utf8')).toBe(existingLock);
    expect((await readLockFile(projectDir)).assets).toHaveLength(1);
  });

  it('reports a structured error when the config cannot be written', async () => {
    createProjectPackage();
    symlinkSync(join(projectDir, 'missing-parent', 'config.json'), configPath());

    const code = await run(['init']);

    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain(CONFIG_FILE_NAME);
    expect(existsSync(lockPath())).toBe(false);
  });
});
