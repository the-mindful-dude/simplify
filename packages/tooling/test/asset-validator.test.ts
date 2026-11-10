import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { validateAssetManifest, validateLibraryManifest, validateLibrary } from '../src/index.js';

let createdDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'simplify-asset-validator-test-'));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  createdDirs = [];
});

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value), 'utf8');
}

function writeFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

const validAssetManifest = {
  schemaVersion: 1,
  id: 'ui/button',
  category: 'ui',
  name: 'Button',
  description: 'An accessible button primitive.',
  version: '1.0.0',
  publisher: 'simplify.dev',
  status: 'official',
  license: 'MIT',
  targets: [{ language: 'TypeScript', framework: 'React' }],
  implementations: [
    {
      id: 'react',
      target: { language: 'TypeScript', framework: 'React' },
      mode: 'source',
      entry: 'src/button.tsx',
    },
  ],
  installation: {
    modes: [
      {
        mode: 'source',
        files: [{ source: 'src/button.tsx', target: 'components/button.tsx' }],
      },
    ],
  },
  documentation: {
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    examples: ['examples/button.tsx'],
  },
};

describe('validateAssetManifest', () => {
  it('returns valid for a well-formed asset manifest', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'asset.json'), validAssetManifest);

    const result = await validateAssetManifest(join(dir, 'asset.json'));

    expect(result.valid).toBe(true);
    expect(result.value?.id).toBe('ui/button');
    expect(result.issues).toEqual([]);
  });

  it('throws when the manifest file is missing', async () => {
    const dir = makeTempDir();
    await expect(validateAssetManifest(join(dir, 'missing.json'))).rejects.toThrow(
      'file not found',
    );
  });

  it('throws when the manifest is not valid JSON', async () => {
    const dir = makeTempDir();
    writeFile(join(dir, 'asset.json'), '{ not json');
    await expect(validateAssetManifest(join(dir, 'asset.json'))).rejects.toThrow('as JSON');
  });

  it('returns issues for a manifest that fails the schema', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'asset.json'), { schemaVersion: 99, id: 'ui/button' });

    const result = await validateAssetManifest(join(dir, 'asset.json'));

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.value).toBeUndefined();
  });

  it('flags an asset id category that does not match the declared category', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'asset.json'), {
      ...validAssetManifest,
      id: 'blocks/button',
    });

    const result = await validateAssetManifest(join(dir, 'asset.json'));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'assetIdCategory')).toBe(true);
    expect(result.issues[0]!.path).toContain('/id');
  });

  it('includes the manifest path in reported issues', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'asset.json'), { ...validAssetManifest, version: 'not-a-version' });

    const result = await validateAssetManifest(join(dir, 'asset.json'));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes('asset.json'))).toBe(true);
  });
});

describe('validateLibraryManifest', () => {
  it('returns valid for a well-formed library manifest', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      publishing: { include: ['**'] },
    });

    const result = await validateLibraryManifest(join(dir, 'library.json'));

    expect(result.valid).toBe(true);
    expect(result.value?.assets).toEqual(['ui/button/asset.json']);
    expect(result.issues).toEqual([]);
  });

  it('flags duplicate asset paths', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json', 'ui/button/asset.json'],
      publishing: { include: ['**'] },
    });

    const result = await validateLibraryManifest(join(dir, 'library.json'));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'duplicateAsset')).toBe(true);
  });

  it('flags unsafe asset paths', async () => {
    const dir = makeTempDir();
    writeJson(join(dir, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['../shared/asset.json'],
      publishing: { include: ['**'] },
    });

    const result = await validateLibraryManifest(join(dir, 'library.json'));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'safePath')).toBe(true);
  });
});

describe('validateLibrary', () => {
  function createValidLibrary(root: string): void {
    writeJson(join(root, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      publishing: { include: ['**'] },
    });
    writeJson(join(root, 'ui/button/asset.json'), validAssetManifest);
    writeFile(join(root, 'ui/button/src/button.tsx'), 'export const Button = () => null;');
    writeFile(join(root, 'ui/button/README.md'), '# Button');
    writeFile(join(root, 'ui/button/CHANGELOG.md'), '# Changelog');
    writeFile(
      join(root, 'ui/button/examples/button.tsx'),
      'import { Button } from "./src/button";',
    );
    writeFile(join(root, 'ui/button/src/button.test.ts'), 'describe("Button", () => {});');
  }

  it('returns valid for a complete library', async () => {
    const root = makeTempDir();
    createValidLibrary(root);

    const result = await validateLibrary(root);

    expect(result.valid).toBe(true);
    expect(result.library?.id).toBe('ui-library');
    expect(result.assets.length).toBe(1);
    expect(result.assets[0]!.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails when no library manifest exists', async () => {
    const root = makeTempDir();

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.library).toBeUndefined();
    expect(result.issues.some((issue) => issue.keyword === 'missingLibraryManifest')).toBe(true);
  });

  it('fails when a referenced asset manifest is missing', async () => {
    const root = makeTempDir();
    writeJson(join(root, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      publishing: { include: ['**'] },
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'missingAssetManifest')).toBe(true);
    expect(result.assets.length).toBe(0);
  });

  it('fails when an asset manifest fails validation', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    writeJson(join(root, 'ui/button/asset.json'), {
      ...validAssetManifest,
      version: 'not-semver',
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.assets[0]!.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'invalidAssetVersion')).toBe(true);
  });

  it('fails when an implementation entry is missing', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    rmSync(join(root, 'ui/button/src/button.tsx'), { recursive: true, force: true });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'missingEntry')).toBe(true);
  });

  it('fails when an installation source is missing', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    writeJson(join(root, 'ui/button/asset.json'), {
      ...validAssetManifest,
      installation: {
        modes: [
          {
            mode: 'source',
            files: [{ source: 'src/missing.tsx', target: 'components/button.tsx' }],
          },
        ],
      },
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'missingSource')).toBe(true);
  });

  it('fails when a declared documentation file is missing', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    rmSync(join(root, 'ui/button/README.md'), { recursive: true, force: true });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'missingDocumentation')).toBe(true);
  });

  it('fails when no test files exist for an asset', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    rmSync(join(root, 'ui/button/src/button.test.ts'), { recursive: true, force: true });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'missingTests')).toBe(true);
  });

  it('flags unsafe paths in installation files', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    writeJson(join(root, 'ui/button/asset.json'), {
      ...validAssetManifest,
      installation: {
        modes: [
          {
            mode: 'source',
            files: [{ source: '../etc/passwd', target: '/absolute/x.tsx' }],
          },
        ],
      },
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'safePath')).toBe(true);
  });

  it('flags dependency versions that are not semantic versioning', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    writeJson(join(root, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      dependencies: {
        registry: [{ id: 'ui/button', version: 'not-semver' }],
      },
      publishing: { include: ['**'] },
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'invalidDependencyVersion')).toBe(true);
  });

  it('flags library versions that are not semantic versioning', async () => {
    const root = makeTempDir();
    createValidLibrary(root);
    writeJson(join(root, 'library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: 'not-semver',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      publishing: { include: ['**'] },
    });

    const result = await validateLibrary(root);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.keyword === 'invalidLibraryVersion')).toBe(true);
  });

  it('resolves simplify/library.json as the library manifest', async () => {
    const root = makeTempDir();
    writeJson(join(root, 'simplify/library.json'), {
      schemaVersion: 1,
      id: 'ui-library',
      name: 'UI Library',
      description: 'UI components.',
      version: '1.0.0',
      license: 'MIT',
      assets: ['ui/button/asset.json'],
      publishing: { include: ['**'] },
    });
    writeJson(join(root, 'ui/button/asset.json'), validAssetManifest);
    writeFile(join(root, 'ui/button/src/button.tsx'), 'export const Button = () => null;');
    writeFile(join(root, 'ui/button/README.md'), '# Button');
    writeFile(join(root, 'ui/button/CHANGELOG.md'), '# Changelog');
    writeFile(
      join(root, 'ui/button/examples/button.tsx'),
      'import { Button } from "./src/button";',
    );
    writeFile(join(root, 'ui/button/src/button.test.ts'), 'describe("Button", () => {});');

    const result = await validateLibrary(root);

    expect(result.valid).toBe(true);
    expect(result.library?.id).toBe('ui-library');
  });
});
