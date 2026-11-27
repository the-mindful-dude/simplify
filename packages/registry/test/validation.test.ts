import { describe, expect, it } from 'vitest';

import {
  validateAssetManifest,
  validateDevelopmentSnapshot,
  validateLibraryManifest,
  validateProjectConfiguration,
  validatePublicationRecord,
  validateRegistryIndex,
  validateRepositoryAssociation,
} from '../src/index.js';

const validAsset = {
  schemaVersion: 1,
  id: 'ui/button',
  category: 'ui',
  name: 'Button',
  description: 'Accessible button primitive with variants and sizes.',
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
        files: [
          {
            source: 'src/button.tsx',
            target: 'src/components/ui/button.tsx',
          },
        ],
      },
    ],
  },
} as const;

const validLibrary = {
  schemaVersion: 1,
  id: 'agent-chat',
  name: 'Agent Chat',
  description: 'Reusable agent conversation interfaces and logic.',
  version: '1.0.0',
  license: 'MIT',
  assets: ['simplify/assets/blocks/agent-chat.json'],
  publishing: {
    include: ['src/**', 'simplify/**', 'README.md'],
    exclude: ['**/node_modules/**', '**/.env*'],
  },
} as const;

describe('asset manifest validation', () => {
  it('accepts a valid asset manifest', () => {
    const result = validateAssetManifest(validAsset);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects an asset whose ID category does not match its category', () => {
    const result = validateAssetManifest({ ...validAsset, category: 'blocks' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: '/id', keyword: 'assetIdCategory' }),
    );
  });

  it('rejects source mappings that escape the project root', () => {
    const result = validateAssetManifest({
      ...validAsset,
      installation: {
        modes: [
          {
            mode: 'source',
            files: [{ source: 'src/button.tsx', target: '../outside/button.tsx' }],
          },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ keyword: 'safePath' }));
  });

  it('rejects implementations without matching installation metadata', () => {
    const result = validateAssetManifest({
      ...validAsset,
      implementations: [{ ...validAsset.implementations[0], mode: 'hybrid' }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ keyword: 'installationModeCoverage' }),
    );
  });

  it('rejects malformed versions and asset IDs at the schema boundary', () => {
    expect(validateAssetManifest({ ...validAsset, version: '1.0' }).valid).toBe(false);
    expect(validateAssetManifest({ ...validAsset, id: 'Button' }).valid).toBe(false);
  });
});

describe('library manifest validation', () => {
  it('accepts a valid library manifest', () => {
    expect(validateLibraryManifest(validLibrary).valid).toBe(true);
  });

  it('rejects duplicate asset manifest paths', () => {
    const result = validateLibraryManifest({
      ...validLibrary,
      assets: [validLibrary.assets[0], validLibrary.assets[0]],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ keyword: 'duplicateAsset' }));
  });

  it('rejects unsafe asset manifest paths', () => {
    const result = validateLibraryManifest({
      ...validLibrary,
      assets: ['../outside/asset.json'],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ keyword: 'safePath' }));
  });
});

describe('project and registry contracts', () => {
  it('validates project configuration', () => {
    const result = validateProjectConfiguration({
      schemaVersion: 1,
      packageManager: 'pnpm',
      installation: {
        defaultMode: 'source',
        paths: {
          ui: 'src/components/ui',
          blocks: 'src/components/blocks',
          logic: 'src/lib',
          integrations: 'src/integrations',
          hooks: 'src/hooks',
          styles: 'src/styles',
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unsupported installation modes in project configuration', () => {
    const result = validateProjectConfiguration({
      schemaVersion: 1,
      installation: {
        defaultMode: 'automatic',
        paths: {
          ui: 'ui',
          blocks: 'blocks',
          logic: 'logic',
          integrations: 'integrations',
          hooks: 'hooks',
          styles: 'styles',
        },
      },
    });
    expect(result.valid).toBe(false);
  });

  it('validates immutable publication records', () => {
    const result = validatePublicationRecord({
      schemaVersion: 1,
      libraryId: 'agent-chat',
      version: '1.2.0',
      source: {
        repositoryId: 'R_kgDO000000',
        owner: 'simplify-dev',
        name: 'agent-chat',
        url: 'https://github.com/simplify-dev/agent-chat',
        commitSha: '0123456789abcdef0123456789abcdef01234567',
        tag: 'v1.2.0',
      },
      publishedAt: '2026-01-01T00:00:00.000Z',
      artifact: {
        url: 'https://registry.simplify.dev/libraries/agent-chat/1.2.0.tar.gz',
        integrity: 'sha256-abc',
      },
      publisher: 'simplify-dev',
      immutable: true,
    });
    expect(result.valid).toBe(true);
  });

  it('validates development snapshots separately from stable releases', () => {
    const result = validateDevelopmentSnapshot({
      libraryId: 'agent-chat',
      branch: 'main',
      commitSha: '0123456789abcdef0123456789abcdef01234567',
      createdAt: '2026-01-01T00:00:00.000Z',
      kind: 'development',
    });
    expect(result.valid).toBe(true);
  });

  it('validates repository associations', () => {
    const result = validateRepositoryAssociation({
      repositoryId: 'R_kgDO000000',
      owner: 'simplify-dev',
      name: 'agent-chat',
      url: 'https://github.com/simplify-dev/agent-chat',
      defaultBranch: 'main',
      visibility: 'public',
      libraryId: 'agent-chat',
      linkedAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
    });
    expect(result.valid).toBe(true);
  });

  it('validates registry indexes', () => {
    const result = validateRegistryIndex({
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
      ],
      libraries: [
        {
          id: 'agent-chat',
          name: 'Agent Chat',
          description: 'Reusable agent conversation interfaces.',
          version: '1.0.0',
          publisher: 'simplify.dev',
          assets: ['blocks/agent-chat'],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });
});
