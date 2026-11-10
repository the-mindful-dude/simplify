vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { readFile } from 'node:fs/promises';

import {
  RegistryClient,
  RegistryClientError,
  type AssetManifest,
  type LibraryManifest,
  type RegistryAssetSummary,
  type RegistryIndex,
  type RegistryLibrarySummary,
} from '../src/client/index.js';

const mockReadFile = readFile as unknown as ReturnType<typeof vi.fn>;

const registryRoot = '/mock/registry';

const indexFixture: RegistryIndex = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  assets: [
    {
      id: 'ui/button',
      category: 'ui',
      name: 'Button',
      description: 'Accessible button primitive.',
      version: '1.0.0',
      publisher: 'simplify.dev',
      status: 'official',
      targets: [{ language: 'typescript', framework: 'react' }],
    },
    {
      id: 'ui/dialog',
      category: 'ui',
      name: 'Dialog',
      description: 'Accessible dialog primitive.',
      version: '2.0.0',
      publisher: 'simplify.dev',
      status: 'community',
      targets: [{ language: 'typescript', framework: 'react' }],
    },
    {
      id: 'blocks/calendar',
      category: 'blocks',
      name: 'Calendar',
      description: 'A calendar block.',
      version: '0.5.0',
      publisher: 'simplify.dev',
      status: 'verified',
      targets: [{ language: 'typescript', framework: 'react' }],
    },
  ],
  libraries: [
    {
      id: 'agent-chat',
      name: 'Agent Chat',
      description: 'Reusable agent conversation interfaces.',
      version: '1.0.0',
      publisher: 'simplify.dev',
      assets: ['ui/button'],
    },
  ],
};

const buttonManifest: AssetManifest = {
  schemaVersion: 1,
  id: 'ui/button',
  category: 'ui',
  name: 'Button',
  description: 'Accessible button primitive.',
  version: '1.0.0',
  publisher: 'simplify.dev',
  status: 'official',
  license: 'MIT',
  targets: [{ language: 'typescript', framework: 'react' }],
  implementations: [
    {
      id: 'react',
      target: { language: 'typescript', framework: 'react' },
      mode: 'source',
      entry: 'src/button.tsx',
    },
  ],
  installation: {
    modes: [
      {
        mode: 'source',
        files: [{ source: 'src/button.tsx', target: 'src/components/ui/button.tsx' }],
      },
    ],
  },
};

const agentChatManifest: LibraryManifest = {
  schemaVersion: 1,
  id: 'agent-chat',
  name: 'Agent Chat',
  description: 'Reusable agent conversation interfaces.',
  version: '1.0.0',
  license: 'MIT',
  assets: ['ui/button'],
  publishing: {
    include: ['src/**', 'README.md'],
    exclude: ['**/node_modules/**'],
  },
};

function fixtureFor(filePath: string): string | Buffer {
  const key = String(filePath);
  if (key === `${registryRoot}/index.json`) {
    return JSON.stringify(indexFixture);
  }
  if (key === `${registryRoot}/assets/ui/ui/button/@1.0.0/manifest.json`) {
    return JSON.stringify(buttonManifest);
  }
  if (key === `${registryRoot}/assets/blocks/blocks/calendar/@0.5.0/manifest.json`) {
    return JSON.stringify({
      ...buttonManifest,
      id: 'blocks/calendar',
      category: 'blocks',
      name: 'Calendar',
      version: '0.5.0',
    });
  }
  if (key === `${registryRoot}/libraries/agent-chat/@1.0.0/manifest.json`) {
    return JSON.stringify(agentChatManifest);
  }
  if (key === `${registryRoot}/assets/ui/ui/button/@1.0.0/src/button.tsx`) {
    return Buffer.from('export const Button = () => null;\n');
  }
  const error = new Error(
    `ENOENT: no such file or directory, open '${key}'`,
  ) as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  error.errno = -2;
  error.path = key;
  throw error;
}

beforeEach(() => {
  mockReadFile.mockReset();
});

describe('RegistryClient', () => {
  it('loads the full registry index', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const index = await client.getRegistryIndex();

    expect(index.schemaVersion).toBe(1);
    expect(index.assets).toHaveLength(3);
    expect(index.libraries).toHaveLength(1);
  });

  it('gets an asset by ID and version', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const asset = await client.getAsset('ui/button', '1.0.0');

    expect(asset).not.toBeNull();
    expect(asset?.id).toBe('ui/button');
    expect(asset?.version).toBe('1.0.0');
  });

  it('resolves the latest version from the index when version is omitted', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const asset = await client.getAsset('ui/button');

    expect(asset?.id).toBe('ui/button');
    expect(asset?.version).toBe('1.0.0');
  });

  it('returns null when an asset is not found', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const asset = await client.getAsset('ui/nonexistent');

    expect(asset).toBeNull();
  });

  it('returns null when an asset manifest file is missing', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const asset = await client.getAsset('ui/dialog', '2.0.0');

    expect(asset).toBeNull();
  });

  it('looks up a library by ID', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const library = await client.getLibrary('agent-chat');

    expect(library).not.toBeNull();
    expect(library?.id).toBe('agent-chat');
    expect(library?.version).toBe('1.0.0');
  });

  it('returns null when a library is not found', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const library = await client.getLibrary('nonexistent');

    expect(library).toBeNull();
  });

  it('lists assets filtered by category', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const assets = await client.listAssets('ui');

    expect(assets).toHaveLength(2);
    expect(assets.every((summary) => summary.category === 'ui')).toBe(true);
  });

  it('lists assets filtered by category and status', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const assets = await client.listAssets('ui', 'official');

    expect(assets).toHaveLength(1);
    expect(assets[0]!.id).toBe('ui/button');
  });

  it('lists all libraries', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const libraries = await client.listLibraries();

    expect(libraries).toHaveLength(1);
    expect(libraries[0]!.id).toBe('agent-chat');
  });

  it('retrieves an asset file as bytes', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const bytes = await client.getAssetFile('ui/button', '1.0.0', 'src/button.tsx');

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toContain('export const Button');
  });

  it('throws for an unsafe source path', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    await expect(client.getAssetFile('ui/button', '1.0.0', '../outside/file.tsx')).rejects.toThrow(
      RegistryClientError,
    );
  });

  it('throws a descriptive error when the index file is missing', async () => {
    const error = new Error(
      "ENOENT: no such file or directory, open '/mock/registry/index.json'",
    ) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    mockReadFile.mockRejectedValue(error);

    const client = new RegistryClient({ registryRoot });
    await expect(client.getRegistryIndex()).rejects.toThrow(RegistryClientError);
  });

  it('throws a descriptive error when the index JSON is invalid', async () => {
    mockReadFile.mockResolvedValue('{ not valid json');

    const client = new RegistryClient({ registryRoot });
    await expect(client.getRegistryIndex()).rejects.toThrow(RegistryClientError);
  });

  it('throws for an invalid asset ID', async () => {
    mockReadFile.mockResolvedValue('');

    const client = new RegistryClient({ registryRoot });
    await expect(client.getAsset('Button')).rejects.toThrow(RegistryClientError);
  });

  it('returns typed summaries from the index', async () => {
    mockReadFile.mockImplementation((filePath: string) => Promise.resolve(fixtureFor(filePath)));

    const client = new RegistryClient({ registryRoot });
    const index = await client.getRegistryIndex();

    const summaries: readonly RegistryAssetSummary[] = index.assets;
    const libraries: readonly RegistryLibrarySummary[] = index.libraries;

    expect(summaries[0]!.category).toBe('ui');
    expect(libraries[0]!.assets).toContain('ui/button');
  });
});
