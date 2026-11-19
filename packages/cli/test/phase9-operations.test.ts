import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAsset = vi.hoisted(() => vi.fn());
const mockGetAssetFile = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());

vi.mock('@simplify-dev/registry', () => {
  class RegistryClientError extends Error {
    readonly code: string;

    constructor(message: string, code: string) {
      super(message);
      this.name = 'RegistryClientError';
      this.code = code;
    }
  }

  class RegistryClient {
    getAsset = mockGetAsset;
    getAssetFile = mockGetAssetFile;
  }

  class DependencyResolver {
    resolve = mockResolve;
  }

  return { RegistryClient, RegistryClientError, DependencyResolver };
});

vi.mock('@simplify-dev/schemas', () => ({
  projectConfigurationSchema: { type: 'object', additionalProperties: true },
}));

import { HybridInstaller } from '../src/installation/hybrid-installer.js';
import { SourceInstaller } from '../src/installation/source-installer.js';
import {
  InstallationPlanError,
  planInstallation,
  validateInstallationPlan,
} from '../src/installation/planner.js';
import { assertSafePath, isSafePath, validateTargetPath } from '../src/installation/path-safety.js';
import {
  cleanupStaleTempArtifacts,
  rollback,
  safeWrite,
  type BackupRecord,
} from '../src/installation/safe-write.js';
import { hashContent, readLockFile, writeLockFile } from '../src/installation/lockfile.js';
import type { FileChange, InstallationPlan } from '../src/installation/types.js';
import type { ProjectConfiguration, ProjectDetectionResult } from '../src/installation/types.js';

const temporaryDirectories: string[] = [];

function createProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'simplify-phase9-'));
  temporaryDirectories.push(directory);
  return directory;
}

function writeProjectConfig(root: string): void {
  writeFileSync(
    join(root, 'simplify.config.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        packageManager: 'pnpm',
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
  );
}

const baseProjectConfig: ProjectConfiguration = {
  schemaVersion: 1,
  packageManager: 'pnpm',
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
};

const baseDetectionResult: ProjectDetectionResult = {
  projectRoot: '/test/project',
  language: 'typescript',
  framework: 'react',
  packageManager: 'pnpm',
  versions: { node: '20.0.0', framework: '18.0.0', typescript: '5.0.0' },
  sourceDirectories: ['src'],
  importAliases: { '@': './src' },
  monorepo: { isMonorepo: false },
  simplifyConfig: true,
};

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

function fileChange(
  source: string,
  target: string,
  overrides: Partial<FileChange> = {},
): FileChange {
  const status = overrides.status ?? 'new';
  return {
    source,
    target,
    assetId: 'blocks/chat',
    status,
    exists: status !== 'new',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Phase 9.5 path safety and plan validation', () => {
  it('rejects path traversal and absolute/escaped paths', () => {
    const root = createProject();
    expect(isSafePath('../secrets.txt')).toBe(false);
    expect(isSafePath('/etc/passwd')).toBe(false);
    expect(validateTargetPath('src/../../etc/passwd', root)).toBe(false);
    expect(() => assertSafePath('../outside.txt', root)).toThrow();
  });

  it('validates installation plans before apply and rejects unsafe targets', () => {
    const root = createProject();
    const plan = basePlan({
      fileChanges: [fileChange('chat.tsx', '../evil.ts')],
    });

    expect(() => validateInstallationPlan(plan, root)).toThrow(InstallationPlanError);
    expect(() => validateInstallationPlan(plan, root)).toThrow(/Unsafe|outside|escapes/i);
  });

  it('rejects duplicate file targets in plan validation', () => {
    const root = createProject();
    const plan = basePlan({
      fileChanges: [
        fileChange('a.tsx', 'components/Chat.tsx'),
        fileChange('b.tsx', 'components/Chat.tsx'),
      ],
    });

    expect(() => validateInstallationPlan(plan, root)).toThrow(InstallationPlanError);
    expect(() => validateInstallationPlan(plan, root)).toThrow(/Duplicate file target/i);
  });

  it('rejects plans that would write secret env files', () => {
    const root = createProject();
    const plan = basePlan({
      fileChanges: [fileChange('env', '.env')],
    });

    expect(() => validateInstallationPlan(plan, root)).toThrow(InstallationPlanError);
    expect(() => validateInstallationPlan(plan, root)).toThrow(/secret|env/i);
  });

  it('planner rejects unsafe source mappings and targetPath traversal', async () => {
    mockGetAsset.mockResolvedValue({
      id: 'blocks/chat',
      version: '1.0.0',
      category: 'blocks',
      name: 'Chat',
      publisher: 'simplify-dev',
      schemaVersion: 1,
      description: 'chat',
      status: 'official',
      license: 'MIT',
      targets: [{ language: 'typescript', framework: 'react' }],
      implementations: [
        {
          id: 'blocks/chat',
          target: { language: 'typescript', framework: 'react' },
          mode: 'source',
          entry: './chat.tsx',
        },
      ],
      installation: {
        modes: [{ mode: 'source', files: [{ source: 'chat.tsx', target: 'components/chat.tsx' }] }],
      },
    });
    mockResolve.mockResolvedValue({
      assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
      registryDependencies: [],
      packageDependencies: [],
      installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
      fileMappings: [
        { source: '../evil.ts', target: 'components/chat.tsx', assetId: 'blocks/chat' },
      ],
      environmentVariables: [],
      configurationChanges: [],
    });

    await expect(
      planInstallation(
        { assetId: 'blocks/chat', mode: 'source', cwd: createProject() },
        baseProjectConfig,
        baseDetectionResult,
      ),
    ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
  });
});

describe('Phase 9.5 conflict classification and modifications', () => {
  it('classifies unchanged, modified, and new files during planning', async () => {
    const root = createProject();
    const unchangedPath = join(root, 'components/unchanged.tsx');
    const modifiedPath = join(root, 'components/modified.tsx');
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(unchangedPath, 'same');
    writeFileSync(modifiedPath, 'local-change');

    mockGetAsset.mockResolvedValue({
      id: 'blocks/chat',
      version: '1.0.0',
      category: 'blocks',
      name: 'Chat',
      publisher: 'simplify-dev',
      schemaVersion: 1,
      description: 'chat',
      status: 'official',
      license: 'MIT',
      targets: [{ language: 'typescript', framework: 'react' }],
      implementations: [
        {
          id: 'blocks/chat',
          target: { language: 'typescript', framework: 'react' },
          mode: 'source',
          entry: './chat.tsx',
        },
      ],
      installation: {
        modes: [
          {
            mode: 'source',
            files: [
              { source: 'unchanged.tsx', target: 'components/unchanged.tsx' },
              { source: 'modified.tsx', target: 'components/modified.tsx' },
              { source: 'new.tsx', target: 'components/new.tsx' },
            ],
          },
        ],
      },
    });
    mockResolve.mockResolvedValue({
      assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
      registryDependencies: [],
      packageDependencies: [],
      installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
      fileMappings: [
        { source: 'unchanged.tsx', target: 'components/unchanged.tsx', assetId: 'blocks/chat' },
        { source: 'modified.tsx', target: 'components/modified.tsx', assetId: 'blocks/chat' },
        { source: 'new.tsx', target: 'components/new.tsx', assetId: 'blocks/chat' },
      ],
      environmentVariables: [],
      configurationChanges: [],
    });
    mockGetAssetFile.mockImplementation(async (_id: string, _v: string, source: string) => {
      if (source === 'modified.tsx') return new Uint8Array(Buffer.from('registry-change'));
      return new Uint8Array(Buffer.from('same'));
    });

    const plan = await planInstallation(
      { assetId: 'blocks/chat', mode: 'source', cwd: root },
      baseProjectConfig,
      { ...baseDetectionResult, projectRoot: root },
    );

    expect(plan.fileChanges.find((c) => c.target === 'components/unchanged.tsx')?.status).toBe(
      'unchanged',
    );
    expect(plan.fileChanges.find((c) => c.target === 'components/modified.tsx')?.status).toBe(
      'modified',
    );
    expect(plan.fileChanges.find((c) => c.target === 'components/new.tsx')?.status).toBe('new');
  });

  it('detects locally modified and missing tracked files using lock hashes', async () => {
    const root = createProject();
    const modifiedPath = join(root, 'components/modified.tsx');
    const missingPath = join(root, 'components/missing.tsx');
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(modifiedPath, 'user-edited');
    // missingPath intentionally not created

    const originalHash = hashContent('original');
    await writeLockFile(
      {
        schemaVersion: 1,
        assets: [
          {
            id: 'blocks/chat',
            version: '1.0.0',
            mode: 'source',
            installedAt: new Date().toISOString(),
            files: [
              {
                path: 'components/modified.tsx',
                hash: originalHash,
                sourceHash: originalHash,
                assetId: 'blocks/chat',
                source: 'modified.tsx',
              },
              {
                path: 'components/missing.tsx',
                hash: originalHash,
                sourceHash: originalHash,
                assetId: 'blocks/chat',
                source: 'missing.tsx',
              },
            ],
            packageDependencies: [],
            registryDependencies: [],
            configChanges: [],
          },
        ],
      },
      root,
    );

    const lock = await readLockFile(root);
    const record = lock.assets[0]!;
    const filesByPath = new Map(record.files.map((file) => [file.path, file] as const));
    const modifiedFile = filesByPath.get('components/modified.tsx');
    const missingFile = filesByPath.get('components/missing.tsx');
    expect(modifiedFile).toBeDefined();
    expect(missingFile).toBeDefined();
    expect(hashContent(readFileSync(modifiedPath))).not.toBe(modifiedFile!.hash);
    expect(existsSync(missingPath)).toBe(false);
  });

  it('source installer preserves modified files unless explicitly replaced', async () => {
    const root = createProject();
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components/Chat.tsx'), 'user content');
    mockGetAssetFile.mockResolvedValue(new Uint8Array(Buffer.from('registry content')));

    const installer = new SourceInstaller({ cwd: root });
    await expect(
      installer.install({
        assetId: 'blocks/chat',
        version: '1.0.0',
        files: [fileChange('chat.tsx', 'components/Chat.tsx', { status: 'modified' })],
        conflictPolicy: 'reject',
      }),
    ).rejects.toMatchObject({ code: 'TARGET_EXISTS' });
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('user content');

    const replaced = await installer.install({
      assetId: 'blocks/chat',
      version: '1.0.0',
      files: [fileChange('chat.tsx', 'components/Chat.tsx', { status: 'modified' })],
      conflictPolicy: 'replace',
    });
    expect(replaced.filesReplaced).toBe(1);
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('registry content');
  });

  it('hybrid installer skips modified/user-owned files when policy is skip-modified', async () => {
    const root = createProject();
    writeProjectConfig(root);
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components/Chat.tsx'), 'local change');
    mockGetAssetFile.mockResolvedValue(new Uint8Array(Buffer.from('registry content')));

    const installer = new HybridInstaller();
    const result = await installer.install({
      plan: basePlan({
        fileChanges: [
          fileChange('chat.tsx', 'components/Chat.tsx', { status: 'modified', exists: true }),
        ],
      }),
      cwd: root,
      conflictPolicy: 'skip-modified',
    });

    expect(result.filesInstalled).toEqual([]);
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('local change');
  });
});

describe('Phase 9.5 secrets, env, backups, rollback, and recovery', () => {
  it('appends only to .env.example and never touches .env secrets', async () => {
    const root = createProject();
    writeProjectConfig(root);
    writeFileSync(join(root, '.env.example'), 'EXISTING=1\n');
    writeFileSync(join(root, '.env'), 'SECRET_TOKEN=do-not-change\n');
    mockGetAssetFile.mockResolvedValue(new Uint8Array(Buffer.from('export {};')));

    const result = await new HybridInstaller().install({
      plan: basePlan({
        environmentVariables: [
          { name: 'CHAT_API_URL', description: 'Chat API', required: true },
          { name: 'EXISTING', description: 'Existing var', required: false },
        ],
      }),
      cwd: root,
    });

    expect(result.envChanges).toEqual(['CHAT_API_URL']);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('SECRET_TOKEN=do-not-change\n');
    const example = readFileSync(join(root, '.env.example'), 'utf8');
    expect(example).toContain('EXISTING=1');
    expect(example).toContain('CHAT_API_URL=');
  });

  it('rejects installer plans that target secret env files directly', async () => {
    const root = createProject();
    writeProjectConfig(root);

    await expect(
      new HybridInstaller().install({
        plan: basePlan({
          fileChanges: [fileChange('env', '.env', { status: 'new' })],
        }),
        cwd: root,
      }),
    ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
  });

  it('creates backups and rolls back to originals on multi-file failure', async () => {
    const root = createProject();
    writeProjectConfig(root);
    mkdirSync(join(root, 'components'), { recursive: true });
    const original = 'original content';
    writeFileSync(join(root, 'components/Keep.tsx'), original);

    const missingRegistryError = Object.assign(new Error('missing'), {
      code: 'REGISTRY_FILE_NOT_FOUND',
    });
    mockGetAssetFile.mockImplementation(async (_id: string, _v: string, source: string) => {
      if (source === 'missing.tsx') {
        throw missingRegistryError;
      }
      return new Uint8Array(Buffer.from(`registry:${source}`));
    });

    await expect(
      new SourceInstaller({ cwd: root }).install({
        assetId: 'blocks/chat',
        version: '1.0.0',
        conflictPolicy: 'replace',
        files: [
          fileChange('keep.tsx', 'components/Keep.tsx', { status: 'modified', exists: true }),
          fileChange('missing.tsx', 'components/Missing.tsx', { status: 'new' }),
        ],
      }),
    ).rejects.toMatchObject({ code: 'SOURCE_NOT_FOUND' });

    expect(readFileSync(join(root, 'components/Keep.tsx'), 'utf8')).toBe(original);
    expect(existsSync(join(root, 'components/Missing.tsx'))).toBe(false);
  });

  it('supports explicit rollback restoration from backup records', async () => {
    const root = createProject();
    const target = join(root, 'a.ts');
    writeFileSync(target, 'original');
    const first = await safeWrite({
      targetPath: 'a.ts',
      content: 'updated',
      backup: true,
      cwd: root,
    });
    expect(first.backupPath).toBeDefined();

    const backups: BackupRecord[] = [
      {
        originalPath: target,
        backupPath: first.backupPath!,
        timestamp: new Date().toISOString(),
      },
    ];
    await rollback(backups);
    expect(readFileSync(target, 'utf8')).toBe('original');
  });

  it('cleans stale temp artifacts for predictable interrupted-write recovery', async () => {
    const root = createProject();
    const tempPath = join(root, 'components', 'Chat.tsx.tmp-interrupted');
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(tempPath, 'partial');
    writeFileSync(join(root, 'components', 'Chat.tsx'), 'stable');

    const cleaned = await cleanupStaleTempArtifacts('components/Chat.tsx', root);
    expect(cleaned).toBeGreaterThan(0);
    expect(existsSync(tempPath)).toBe(false);
    expect(readFileSync(join(root, 'components', 'Chat.tsx'), 'utf8')).toBe('stable');
  });
});

describe('Phase 9 lock/metadata primitives', () => {
  it('tracks installed file hashes and dependencies in .simplify/lock.json', async () => {
    const root = createProject();
    const content = 'export const x = 1;\n';
    const hash = hashContent(content);

    await writeLockFile(
      {
        schemaVersion: 1,
        assets: [
          {
            id: 'blocks/chat',
            version: '1.0.0',
            mode: 'source',
            installedAt: new Date().toISOString(),
            files: [
              {
                path: 'components/Chat.tsx',
                hash,
                sourceHash: hash,
                assetId: 'blocks/chat',
                source: 'chat.tsx',
              },
            ],
            packageDependencies: [{ name: 'react', version: '^19.0.0', kind: 'peer' }],
            registryDependencies: [{ id: 'ui/button', version: '1.2.0' }],
            configChanges: [{ file: 'simplify.config.json', format: 'json', operation: 'merge' }],
          },
        ],
      },
      root,
    );

    const lock = await readLockFile(root);
    expect(lock.assets[0]?.files[0]?.hash).toBe(hash);
    expect(lock.assets[0]?.packageDependencies[0]?.name).toBe('react');
    expect(lock.assets[0]?.registryDependencies[0]?.id).toBe('ui/button');
  });
});
