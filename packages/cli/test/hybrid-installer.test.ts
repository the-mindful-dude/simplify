import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstallationPlan } from '../src/installation/types.js';

const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());

const mockGetAssetFile = vi.hoisted(() => vi.fn());
const mockSafeWrite = vi.hoisted(() => vi.fn());
const mockRollback = vi.hoisted(() => vi.fn());
const mockPkgInstall = vi.hoisted(() => vi.fn());

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    mkdirSync: mockMkdirSync,
  };
});

vi.mock('@simplify-dev/registry', () => ({
  RegistryClient: class {
    getAssetFile = mockGetAssetFile;
  },
}));

vi.mock('../src/installation/safe-write.js', () => ({
  safeWrite: mockSafeWrite,
  rollback: mockRollback,
  SafeWriteError: class SafeWriteError extends Error {
    code: string;
    details: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>) {
      super(message);
      this.name = 'SafeWriteError';
      this.code = code;
      this.details = details ?? {};
    }
  },
}));

vi.mock('../src/installation/package-installer.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/installation/package-installer.js')>();
  return {
    ...actual,
    PackageInstaller: class {
      install = mockPkgInstall;
    },
  };
});

import { HybridInstaller } from '../src/installation/hybrid-installer.js';

const CWD = '/test/project';

function basePlan(overrides: Partial<InstallationPlan> = {}): InstallationPlan {
  return {
    assetId: 'blocks/chat',
    version: '1.0.0',
    installationMode: 'hybrid',
    resolvedAssets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
    fileChanges: [],
    packageDependencies: [],
    environmentVariables: [],
    configurationChanges: [],
    setupSteps: [],
    dryRun: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('');
  mockGetAssetFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
  mockSafeWrite.mockResolvedValue({ written: true });
  mockPkgInstall.mockResolvedValue({
    packageName: 'dep',
    version: '1.0.0',
    installed: true,
    command: 'pnpm add dep@1.0.0',
    lockfileUpdated: true,
  });
  mockRollback.mockResolvedValue(undefined);
});

describe('HybridInstaller', () => {
  it('installs source + package in hybrid plan', async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('components/Chat.tsx'));
    const plan = basePlan({
      fileChanges: [
        {
          source: 'chat.tsx',
          target: 'components/Chat.tsx',
          assetId: 'blocks/chat',
          status: 'new',
          exists: false,
        },
      ],
      packageDependencies: [{ name: 'react', version: '^18.0.0', kind: 'peer' }],
    });

    const installer = new HybridInstaller();
    const result = await installer.install({ plan, cwd: CWD });

    expect(mockGetAssetFile).toHaveBeenCalledWith('blocks/chat', '1.0.0', 'chat.tsx');
    expect(mockSafeWrite).toHaveBeenCalled();
    expect(mockPkgInstall).toHaveBeenCalled();
    expect(result.filesInstalled).toEqual(['components/Chat.tsx']);
    expect(result.packagesInstalled).toHaveLength(1);
  });

  it('fetches dependency files using the resolved dependency version', async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('components/Button.tsx'));
    const plan = basePlan({
      resolvedAssets: [
        { id: 'blocks/chat', version: '1.0.0', category: 'blocks' },
        { id: 'ui/button', version: '2.3.4', category: 'ui' },
      ],
      fileChanges: [
        {
          source: 'button.tsx',
          target: 'components/Button.tsx',
          assetId: 'ui/button',
          status: 'new',
          exists: false,
        },
      ],
    });

    const result = await new HybridInstaller().install({ plan, cwd: CWD });

    expect(mockGetAssetFile).toHaveBeenCalledWith('ui/button', '2.3.4', 'button.tsx');
    expect(result.filesInstalled).toEqual(['components/Button.tsx']);
  });

  it('handles source-only install', async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('components/Only.tsx'));
    const plan = basePlan({
      installationMode: 'source',
      fileChanges: [
        {
          source: 'only.tsx',
          target: 'components/Only.tsx',
          assetId: 'blocks/chat',
          status: 'new',
          exists: false,
        },
      ],
    });

    const result = await new HybridInstaller().install({ plan, cwd: CWD });
    expect(result.filesInstalled).toEqual(['components/Only.tsx']);
    expect(result.packagesInstalled).toEqual([]);
    expect(mockPkgInstall).not.toHaveBeenCalled();
  });

  it('handles package-only install', async () => {
    const plan = basePlan({
      installationMode: 'package',
      packageDependencies: [{ name: 'ai', version: '^3.0.0', kind: 'runtime' }],
    });

    const result = await new HybridInstaller().install({ plan, cwd: CWD });
    expect(result.filesInstalled).toEqual([]);
    expect(result.packagesInstalled).toHaveLength(1);
    expect(mockSafeWrite).not.toHaveBeenCalled();
  });

  it('applies declarative JSON config changes', async () => {
    const configPath = `${CWD}/simplify.config.json`;
    mockExistsSync.mockImplementation((p: unknown) => String(p) === configPath);
    mockReadFileSync.mockImplementation((p: unknown) => {
      if (String(p) === configPath) {
        return JSON.stringify({
          schemaVersion: 1,
          installation: { defaultMode: 'hybrid', paths: {} },
        });
      }
      return '';
    });

    const plan = basePlan({
      configurationChanges: [
        {
          file: 'simplify.config.json',
          format: 'json',
          operation: 'merge',
          data: { chat: { enabled: true } },
        },
      ],
    });

    const result = await new HybridInstaller().install({ plan, cwd: CWD });
    expect(result.configChanges).toEqual(['merge:simplify.config.json']);
    expect(mockSafeWrite).toHaveBeenCalled();
    const call = mockSafeWrite.mock.calls[0]![0] as { content: string };
    expect(call.content).toContain('"chat"');
    expect(call.content).toContain('"enabled": true');
  });

  it('appends to .env.example without replacing and never touches .env', async () => {
    const envExamplePath = `${CWD}/.env.example`;
    mockExistsSync.mockImplementation((p: unknown) => String(p) === envExamplePath);
    mockReadFileSync.mockImplementation((p: unknown) => {
      if (String(p) === envExamplePath) return 'EXISTING=1\n';
      return '';
    });

    const plan = basePlan({
      environmentVariables: [
        { name: 'CHAT_API_URL', description: 'Chat API', required: true },
        { name: 'EXISTING', description: 'Existing var', required: false },
      ],
    });

    const result = await new HybridInstaller().install({ plan, cwd: CWD });
    expect(result.envChanges).toEqual(['CHAT_API_URL']);
    expect(mockSafeWrite).toHaveBeenCalledTimes(1);
    const call = mockSafeWrite.mock.calls[0]![0] as {
      targetPath: string;
      content: string;
    };
    expect(call.targetPath).toBe('.env.example');
    expect(call.content).toContain('EXISTING=1');
    expect(call.content).toContain('CHAT_API_URL=');
    expect(call.content).toContain('# Chat API');
    // ensure .env not written
    expect(
      mockSafeWrite.mock.calls.some((c) => (c[0] as { targetPath: string }).targetPath === '.env'),
    ).toBe(false);
  });

  it('reports manual setup steps', async () => {
    const plan = basePlan({
      setupSteps: [
        { description: 'Configure API key', required: true },
        { description: 'Restart dev server', required: false },
      ],
    });
    const result = await new HybridInstaller().install({
      plan,
      cwd: CWD,
      dryRun: true,
    });
    expect(result.manualSteps).toEqual(['Configure API key', 'Restart dev server']);
  });

  it('rolls back installer-managed file changes on failure', async () => {
    // First file write succeeds and returns backup, second fails
    let callCount = 0;
    mockSafeWrite.mockImplementation(async (opts: { targetPath: string }) => {
      callCount += 1;
      if (opts.targetPath === 'a.ts') {
        return { written: true, backupPath: `${CWD}/a.ts.bak` };
      }
      throw new Error('write failed');
    });
    // verification/file existence checks
    mockExistsSync.mockReturnValue(false);

    const plan = basePlan({
      fileChanges: [
        {
          source: 'a.ts',
          target: 'a.ts',
          assetId: 'blocks/chat',
          status: 'modified',
          exists: true,
        },
        {
          source: 'b.ts',
          target: 'b.ts',
          assetId: 'blocks/chat',
          status: 'new',
          exists: false,
        },
      ],
    });

    await expect(new HybridInstaller().install({ plan, cwd: CWD })).rejects.toMatchObject({
      code: 'WRITE_FAILED',
      details: expect.objectContaining({ rolledBack: true }),
    });
    expect(callCount).toBe(2);
    expect(mockRollback).toHaveBeenCalledTimes(1);
  });

  it('supports dry-run mode without writing files or installing packages', async () => {
    const plan = basePlan({
      fileChanges: [
        {
          source: 'chat.tsx',
          target: 'components/Chat.tsx',
          assetId: 'blocks/chat',
          status: 'new',
          exists: false,
        },
      ],
      packageDependencies: [{ name: 'ai', version: '^3.0.0', kind: 'runtime' }],
      environmentVariables: [{ name: 'API_KEY', description: 'API key', required: true }],
      configurationChanges: [
        {
          file: 'simplify.config.json',
          format: 'json',
          operation: 'merge',
          data: { x: 1 },
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    const result = await new HybridInstaller().install({
      plan,
      cwd: CWD,
      dryRun: true,
    });
    expect(result.filesInstalled).toEqual(['components/Chat.tsx']);
    expect(result.packagesInstalled[0]?.installed).toBe(false);
    expect(result.configChanges).toEqual(['merge:simplify.config.json']);
    expect(result.envChanges).toEqual(['API_KEY']);
    expect(mockSafeWrite).not.toHaveBeenCalled();
    expect(mockPkgInstall).not.toHaveBeenCalled();
    expect(mockGetAssetFile).not.toHaveBeenCalled();
  });

  it('enforces path safety for file targets', async () => {
    const plan = basePlan({
      fileChanges: [
        {
          source: 'chat.tsx',
          target: '../evil.ts',
          assetId: 'blocks/chat',
          status: 'new',
          exists: false,
        },
      ],
    });

    await expect(
      new HybridInstaller().install({ plan, cwd: CWD, dryRun: true }),
    ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
  });
});
