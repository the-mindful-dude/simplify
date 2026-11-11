import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAssetFile = vi.hoisted(() => vi.fn());

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
    getAssetFile(assetId: string, version: string, sourcePath: string) {
      return mockGetAssetFile(assetId, version, sourcePath);
    }
  }

  return { RegistryClient, RegistryClientError };
});

vi.mock('@simplify-dev/schemas', () => ({
  projectConfigurationSchema: {
    type: 'object',
    additionalProperties: true,
  },
}));

import { SourceInstaller } from '../src/installation/source-installer.js';
import type { FileChange } from '../src/installation/types.js';

const DEFAULT_PATHS = {
  ui: '@/components/ui',
  blocks: '@/components/blocks',
  logic: '@/lib',
  integrations: '@/lib/integrations',
  hooks: '@/hooks',
  styles: '@/styles',
} as const;

const temporaryDirectories: string[] = [];

function createProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'simplify-source-'));
  temporaryDirectories.push(directory);
  return directory;
}

function writeConfig(
  root: string,
  options: {
    readonly paths?: Record<string, string>;
    readonly aliases?: Record<string, string>;
  } = {},
): void {
  writeFileSync(
    join(root, 'simplify.config.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        packageManager: 'pnpm',
        ...(options.aliases === undefined
          ? {}
          : {
              registry: {
                url: 'https://registry.simplify.dev',
                aliases: options.aliases,
              },
            }),
        installation: {
          defaultMode: 'source',
          paths: options.paths ?? DEFAULT_PATHS,
        },
      },
      null,
      2,
    ),
  );
}

function writeTsconfig(root: string, paths: Record<string, string[]>): void {
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { baseUrl: '.', paths } }, null, 2),
  );
}

function change(source: string, target: string, overrides: Partial<FileChange> = {}): FileChange {
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

function install(
  root: string,
  files: readonly FileChange[],
  overrides: {
    readonly conflictPolicy?: 'reject' | 'skip' | 'replace';
    readonly dryRun?: boolean;
    readonly assetId?: string;
    readonly version?: string;
    readonly versions?: Record<string, string>;
  } = {},
) {
  return new SourceInstaller({ cwd: root }).install({
    assetId: overrides.assetId ?? 'blocks/chat',
    version: overrides.version ?? '1.0.0',
    files,
    conflictPolicy: overrides.conflictPolicy,
    dryRun: overrides.dryRun,
    versions: overrides.versions,
  });
}

beforeEach(() => {
  mockGetAssetFile.mockReset();
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    try {
      chmodSync(directory, 0o755);
    } catch {
      // Best effort; the directory may not exist or may already be writable.
    }
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Best effort cleanup.
    }
  }
});

describe('SourceInstaller', () => {
  it('copies a source file from the registry and records the installation', async () => {
    const root = createProject();
    mockGetAssetFile.mockResolvedValue(Buffer.from('export const Chat = 1;\n'));

    const result = await install(root, [change('chat.tsx', 'components/Chat.tsx')]);

    expect(result).toMatchObject({
      filesWritten: 1,
      filesSkipped: 0,
      filesReplaced: 0,
      filesFailed: 0,
    });
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe(
      'export const Chat = 1;\n',
    );
    expect(mockGetAssetFile).toHaveBeenCalledWith('blocks/chat', '1.0.0', 'chat.tsx');

    const metadata = JSON.parse(
      readFileSync(join(root, '.simplify/source-installations.json'), 'utf8'),
    ) as Array<{
      assetId: string;
      version: string;
      files: Array<Record<string, string>>;
    }>;
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toMatchObject({
      assetId: 'blocks/chat',
      version: '1.0.0',
    });
    expect(metadata[0]!.files[0]).toMatchObject({
      source: 'chat.tsx',
      target: 'components/Chat.tsx',
      assetId: 'blocks/chat',
      version: '1.0.0',
      status: 'written',
    });
  });

  it('rejects an existing target with the default reject policy', async () => {
    const root = createProject();
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components/Chat.tsx'), 'user content');
    mockGetAssetFile.mockResolvedValue(Buffer.from('registry content'));

    await expect(install(root, [change('chat.tsx', 'components/Chat.tsx')])).rejects.toMatchObject({
      name: 'SourceInstallerError',
      code: 'TARGET_EXISTS',
    });

    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('user content');
    expect(mockGetAssetFile).not.toHaveBeenCalled();
  });

  it('skips an existing target with the skip policy', async () => {
    const root = createProject();
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components/Chat.tsx'), 'user content');
    mockGetAssetFile.mockResolvedValue(Buffer.from('registry content'));

    const result = await install(
      root,
      [change('chat.tsx', 'components/Chat.tsx', { status: 'modified' })],
      { conflictPolicy: 'skip' },
    );

    expect(result.filesWritten).toBe(0);
    expect(result.filesSkipped).toBe(1);
    expect(result.filesReplaced).toBe(0);
    expect(result.warnings?.some((warning) => warning.includes('Skipped'))).toBe(true);
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('user content');
    expect(mockGetAssetFile).not.toHaveBeenCalled();
  });

  it('replaces an existing target with a backup using the replace policy', async () => {
    const root = createProject();
    mkdirSync(join(root, 'components'), { recursive: true });
    writeFileSync(join(root, 'components/Chat.tsx'), 'user content');
    mockGetAssetFile.mockResolvedValue(Buffer.from('registry content'));

    const result = await install(
      root,
      [change('chat.tsx', 'components/Chat.tsx', { status: 'modified' })],
      { conflictPolicy: 'replace' },
    );

    expect(result.filesWritten).toBe(1);
    expect(result.filesSkipped).toBe(0);
    expect(result.filesReplaced).toBe(1);
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('registry content');
    expect(readdirSync(join(root, 'components')).some((file) => file.includes('.bak-'))).toBe(true);

    const metadata = JSON.parse(
      readFileSync(join(root, '.simplify/source-installations.json'), 'utf8'),
    ) as Array<{ files: Array<Record<string, string>> }>;
    expect(metadata[0]!.files[0]!.status).toBe('replaced');
  });

  it('throws SOURCE_NOT_FOUND when the registry file is missing', async () => {
    const root = createProject();
    mockGetAssetFile.mockRejectedValue(
      Object.assign(new Error('Registry file not found'), {
        code: 'REGISTRY_FILE_NOT_FOUND',
      }),
    );

    await expect(
      install(root, [change('missing.tsx', 'components/Missing.tsx')]),
    ).rejects.toMatchObject({
      name: 'SourceInstallerError',
      code: 'SOURCE_NOT_FOUND',
    });
    expect(existsSync(join(root, 'components/Missing.tsx'))).toBe(false);
  });

  it.skipIf(process.getuid?.() === 0)('maps permission failures to PERMISSION_DENIED', async () => {
    const root = createProject();
    const directory = join(root, 'components');
    mkdirSync(directory, { recursive: true });
    chmodSync(directory, 0o555);
    mockGetAssetFile.mockResolvedValue(Buffer.from('registry content'));

    try {
      await expect(
        install(root, [change('chat.tsx', 'components/Chat.tsx')]),
      ).rejects.toMatchObject({
        name: 'SourceInstallerError',
        code: 'PERMISSION_DENIED',
      });
    } finally {
      chmodSync(directory, 0o755);
    }
  });

  it('rejects path traversal in target and source paths', async () => {
    const root = createProject();
    mockGetAssetFile.mockResolvedValue(Buffer.from('content'));

    await expect(install(root, [change('chat.tsx', '../outside.tsx')])).rejects.toMatchObject({
      code: 'UNSAFE_PATH',
    });

    await expect(
      install(root, [change('../outside.tsx', 'components/Chat.tsx')]),
    ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });

    expect(mockGetAssetFile).not.toHaveBeenCalled();
    expect(existsSync(join(root, '..', 'outside.tsx'))).toBe(false);
  });

  it('does not write files or metadata during a dry run', async () => {
    const root = createProject();
    mockGetAssetFile.mockResolvedValue(Buffer.from('registry content'));

    const result = await install(root, [change('chat.tsx', 'components/Chat.tsx')], {
      dryRun: true,
    });

    expect(result.filesWritten).toBe(0);
    expect(result.filesPlanned).toEqual(['components/Chat.tsx']);
    expect(result.warnings?.some((warning) => warning.includes('Dry run'))).toBe(true);
    expect(existsSync(join(root, 'components/Chat.tsx'))).toBe(false);
    expect(existsSync(join(root, '.simplify/source-installations.json'))).toBe(false);
  });

  it('creates nested target directories', async () => {
    const root = createProject();
    mockGetAssetFile.mockResolvedValue(Buffer.from('export const Button = 1;'));

    const result = await install(root, [change('button.tsx', 'src/components/ui/Button.tsx')]);

    expect(result.filesWritten).toBe(1);
    expect(readFileSync(join(root, 'src/components/ui/Button.tsx'), 'utf8')).toBe(
      'export const Button = 1;',
    );
  });

  it('installs multiple files and records each one', async () => {
    const root = createProject();
    mockGetAssetFile.mockImplementation(
      async (_assetId: string, _version: string, source: string) => Buffer.from(`// ${source}\n`),
    );

    const result = await install(root, [
      change('chat.tsx', 'components/Chat.tsx'),
      change('use-chat.ts', 'hooks/use-chat.ts'),
    ]);

    expect(result.filesWritten).toBe(2);
    expect(readFileSync(join(root, 'components/Chat.tsx'), 'utf8')).toBe('// chat.tsx\n');
    expect(readFileSync(join(root, 'hooks/use-chat.ts'), 'utf8')).toBe('// use-chat.ts\n');

    const metadata = JSON.parse(
      readFileSync(join(root, '.simplify/source-installations.json'), 'utf8'),
    ) as Array<{ files: Array<Record<string, string>> }>;
    expect(metadata[0]!.files).toHaveLength(2);
  });

  it('maps configured paths and rewrites imports to project aliases', async () => {
    const root = createProject();
    writeConfig(root, {
      aliases: { '@simplify': '@/components' },
    });
    writeTsconfig(root, { '~/*': ['./src/*'] });

    mockGetAssetFile.mockResolvedValue(
      Buffer.from(
        [
          'import { Button } from "@/components/ui/button";',
          'import { helper } from "@simplify/lib/helper";',
          'import React from "react";',
          'export const Chat = () => helper(Button, React);',
          '',
        ].join('\n'),
      ),
    );

    const result = await install(root, [change('chat.tsx', 'components/ui/Chat.tsx')]);

    expect(result.filesWritten).toBe(1);
    const target = join(root, 'src/components/ui/Chat.tsx');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toContain('from "~/components/ui/button"');
    expect(content).toContain('from "~/components/lib/helper"');
    expect(content).toContain('from "react"');
  });

  it('throws ALIAS_RESOLUTION_FAILED for malformed TypeScript configuration', async () => {
    const root = createProject();
    writeFileSync(join(root, 'tsconfig.json'), '{ not valid json');
    mockGetAssetFile.mockResolvedValue(Buffer.from('content'));

    await expect(install(root, [change('chat.tsx', 'components/Chat.tsx')])).rejects.toMatchObject({
      name: 'SourceInstallerError',
      code: 'ALIAS_RESOLUTION_FAILED',
    });
    expect(mockGetAssetFile).not.toHaveBeenCalled();
  });
});
