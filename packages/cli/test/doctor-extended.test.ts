import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRegistryIndex = vi.hoisted(() => vi.fn());

vi.mock('@simplify-dev/registry', () => {
  class RegistryClient {
    getRegistryIndex = mockGetRegistryIndex;
  }
  return { RegistryClient };
});

import { run } from '../src/cli.js';
import { hashContent } from '../src/installation/lockfile.js';

const temporaryDirectories: string[] = [];
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

function createProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'simplify-doctor-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeValidConfig(dir: string, registryUrl = 'https://registry.example.test'): void {
  writeFileSync(
    join(dir, 'simplify.config.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        packageManager: 'pnpm',
        registry: { url: registryUrl },
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
      },
      null,
      2,
    ),
    'utf8',
  );
}

function writeLock(
  dir: string,
  files: Array<{ path: string; content: string; source?: string; recordedHash?: string }>,
): void {
  mkdirSync(join(dir, '.simplify'), { recursive: true });
  const lock = {
    schemaVersion: 1,
    assets: [
      {
        id: 'blocks/chat',
        version: '1.0.0',
        mode: 'source',
        installedAt: '2026-01-01T00:00:00.000Z',
        files: files.map((file) => {
          const hash = file.recordedHash ?? hashContent(file.content);
          return {
            path: file.path,
            hash,
            sourceHash: hash,
            assetId: 'blocks/chat',
            source: file.source ?? file.path,
          };
        }),
        packageDependencies: [],
        registryDependencies: [],
        configChanges: [],
      },
    ],
  };
  writeFileSync(join(dir, '.simplify', 'lock.json'), JSON.stringify(lock, null, 2), 'utf8');
}

beforeEach(() => {
  mockGetRegistryIndex.mockReset();
  mockGetRegistryIndex.mockResolvedValue({
    schemaVersion: 1,
    generatedAt: '',
    assets: [],
    libraries: [],
  });
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cwdSpy?.mockRestore();
  cwdSpy = undefined;
  logSpy.mockRestore();
  errorSpy.mockRestore();
  for (const dir of temporaryDirectories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('doctor extended checks', () => {
  it('reports a healthy project with valid config, present .simplify data, and verified assets', async () => {
    const dir = createProject();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    writeValidConfig(dir);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'doctor-fixture',
          private: true,
          dependencies: { react: '18.3.1' },
        },
        null,
        2,
      ),
      'utf8',
    );
    writeFileSync(join(dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n", 'utf8');
    mkdirSync(join(dir, 'components'), { recursive: true });
    const content = 'export const Chat = () => null;\n';
    writeFileSync(join(dir, 'components', 'Chat.tsx'), content, 'utf8');
    writeLock(dir, [{ path: 'components/Chat.tsx', content }]);

    const code = await run(['doctor', '--json']);

    expect(code).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
    const jsonCall = logSpy.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0]!.startsWith('{'),
    );
    expect(jsonCall).toBeDefined();
    const payload = JSON.parse(jsonCall![0] as string) as {
      passed: boolean;
      status: string;
      checks: Array<{ name: string; status: string; message: string }>;
    };
    expect(payload.passed).toBe(true);
    expect(payload.status).toBe('healthy');
    expect(payload.checks.find((c) => c.name === 'project-config')?.status).toBe('healthy');
    expect(payload.checks.find((c) => c.name === 'lock-file')?.status).toBe('healthy');
    expect(payload.checks.find((c) => c.name === 'registry')?.status).toBe('healthy');
  });

  it('reports missing installed files as integrity errors', async () => {
    const dir = createProject();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    writeValidConfig(dir);
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeLock(dir, [{ path: 'components/Missing.tsx', content: 'export {};\n' }]);

    const code = await run(['doctor', '--json']);

    expect(code).toBe(1);
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string) as {
      passed: boolean;
      checks: Array<{
        name: string;
        status: string;
        message: string;
        details?: { missing?: unknown[] };
      }>;
    };
    expect(payload.passed).toBe(false);
    const lockCheck = payload.checks.find((c) => c.name === 'lock-file');
    expect(lockCheck?.status).toBe('error');
    expect(lockCheck?.message).toContain('missing file');
    expect(lockCheck?.details?.missing?.length).toBe(1);
  });

  it('reports modified installed files when hashes do not match', async () => {
    const dir = createProject();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    writeValidConfig(dir);
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeFileSync(join(dir, 'components', 'Chat.tsx'), 'user edited\n', 'utf8');
    writeLock(dir, [
      {
        path: 'components/Chat.tsx',
        content: 'original\n',
        recordedHash: hashContent('original\n'),
      },
    ]);

    const code = await run(['doctor', '--json']);

    expect(code).toBe(1);
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string) as {
      passed: boolean;
      checks: Array<{
        name: string;
        status: string;
        message: string;
        details?: { modified?: unknown[] };
      }>;
    };
    expect(payload.passed).toBe(false);
    const lockCheck = payload.checks.find((c) => c.name === 'lock-file');
    expect(lockCheck?.status).toBe('error');
    expect(lockCheck?.message).toContain('modified file hash');
    expect(lockCheck?.details?.modified?.length).toBe(1);
  });

  it('reports missing lock file with actionable error', async () => {
    const dir = createProject();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    writeValidConfig(dir);

    const code = await run(['doctor', '--json']);

    expect(code).toBe(1);
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string) as {
      passed: boolean;
      checks: Array<{ name: string; status: string; message: string }>;
    };
    expect(payload.passed).toBe(false);
    const lockCheck = payload.checks.find((c) => c.name === 'lock-file');
    expect(lockCheck?.status).toBe('error');
    expect(lockCheck?.message).toContain('.simplify/lock.json not found');
  });

  it('reports unreachable registry as a controlled error', async () => {
    const dir = createProject();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(dir);
    writeValidConfig(dir);
    mkdirSync(join(dir, '.simplify'), { recursive: true });
    writeFileSync(
      join(dir, '.simplify', 'lock.json'),
      JSON.stringify({ schemaVersion: 1, assets: [] }, null, 2),
      'utf8',
    );
    mockGetRegistryIndex.mockRejectedValue(new Error('network unavailable'));

    const code = await run(['doctor', '--json']);

    expect(code).toBe(1);
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string) as {
      passed: boolean;
      checks: Array<{ name: string; status: string; message: string }>;
    };
    expect(payload.passed).toBe(false);
    const registryCheck = payload.checks.find((c) => c.name === 'registry');
    expect(registryCheck?.status).toBe('error');
    expect(registryCheck?.message).toContain('Registry unreachable');
    expect(registryCheck?.message).toContain('network unavailable');
  });
});
