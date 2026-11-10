import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { assetCreateCommand } from '../src/commands/asset-create.js';
import type { CommandContext } from '../src/cli.js';
import { validateLibraryManifest, validateAssetManifest } from '@simplify-dev/registry';

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    args: [],
    options: {},
    dryRun: false,
    verbose: false,
    debug: false,
    json: false,
    interactive: false,
    ...overrides,
  } as CommandContext;
}

let testDir: string;
let logSpy: ReturnType<typeof vi.spyOn>;

const baseLibrary = {
  schemaVersion: 1,
  id: 'test-library',
  name: 'Test Library',
  description: 'A test library for scaffolding.',
  version: '0.1.0',
  license: 'MIT',
  assets: ['simplify/assets/ui/example.asset.json'],
  publishing: {
    include: ['src/**', 'simplify/**', 'README.md', 'CHANGELOG.md'],
    exclude: ['**/node_modules/**', '**/.env*'],
  },
} as const;

async function writeLibrary(library: unknown): Promise<void> {
  await fs.mkdir(join(testDir, 'simplify'), { recursive: true });
  await fs.writeFile(join(testDir, 'simplify', 'library.json'), JSON.stringify(library), 'utf8');
}

async function readManifest(path: string): Promise<unknown> {
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw);
}

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-asset-create-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  await writeLibrary(baseLibrary);
});

afterEach(async () => {
  logSpy.mockRestore();
  await fs.rm(testDir, { recursive: true, force: true });
});

function optionsFor(
  extra: Record<string, string | boolean> = {},
): Record<string, string | boolean> {
  return {
    category: 'ui',
    name: 'Button',
    'target-dir': testDir,
    ...extra,
  };
}

describe('asset-create', () => {
  it('generates a valid asset manifest and scaffolding for an existing library', async () => {
    await assetCreateCommand.handler(makeContext({ options: optionsFor() }));

    const manifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'ui', 'button.json'),
    )) as { readonly id: string; readonly category: string };

    const assetValidation = validateAssetManifest(manifest);
    expect(assetValidation.valid).toBe(true);
    expect(assetValidation.issues).toHaveLength(0);
    expect(manifest.id).toBe('ui/button');
    expect(manifest.category).toBe('ui');

    const library = (await readManifest(join(testDir, 'simplify', 'library.json'))) as {
      readonly assets: readonly string[];
    };
    const libraryValidation = validateLibraryManifest(library);
    expect(libraryValidation.valid).toBe(true);
    expect(library.assets).toContain('simplify/assets/ui/button.json');

    await expect(fs.access(join(testDir, 'src', 'button.tsx'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'src', 'button.test.tsx'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'docs', 'button.md'))).resolves.toBeUndefined();
    await expect(
      fs.access(join(testDir, 'examples', 'button.example.tsx')),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(testDir, 'previews', 'button.preview.tsx')),
    ).resolves.toBeUndefined();
  });

  it('supports logic assets without preview metadata', async () => {
    await assetCreateCommand.handler(
      makeContext({ options: optionsFor({ category: 'logic', name: 'Format Utility' }) }),
    );

    const manifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'logic', 'format-utility.json'),
    )) as { readonly preview?: unknown };

    expect(manifest.preview).toBeUndefined();
    const assetValidation = validateAssetManifest(manifest);
    expect(assetValidation.valid).toBe(true);

    const library = (await readManifest(join(testDir, 'simplify', 'library.json'))) as {
      readonly assets: readonly string[];
    };
    expect(library.assets).toContain('simplify/assets/logic/format-utility.json');
  });

  it('supports a custom asset id', async () => {
    await assetCreateCommand.handler(
      makeContext({ options: optionsFor({ 'asset-id': 'ui/custom-button', name: 'Custom' }) }),
    );

    const manifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'ui', 'custom-button.json'),
    )) as { readonly id: string };
    expect(manifest.id).toBe('ui/custom-button');
  });

  it('writes nothing in dry-run mode', async () => {
    await assetCreateCommand.handler(makeContext({ options: optionsFor(), dryRun: true }));

    await expect(
      fs.access(join(testDir, 'simplify', 'assets', 'ui', 'button.json')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fs.access(join(testDir, 'src', 'button.tsx'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const library = JSON.parse(
      await fs.readFile(join(testDir, 'simplify', 'library.json'), 'utf8'),
    );
    expect(library.assets).toEqual(['simplify/assets/ui/example.asset.json']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
  });

  it('refuses to overwrite existing files', async () => {
    await fs.mkdir(join(testDir, 'simplify', 'assets', 'ui'), { recursive: true });
    await fs.writeFile(join(testDir, 'simplify', 'assets', 'ui', 'button.json'), '{}', 'utf8');

    let error: unknown;
    try {
      await assetCreateCommand.handler(makeContext({ options: optionsFor() }));
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'FILE_EXISTS' });
    const unchanged = await fs.readFile(
      join(testDir, 'simplify', 'assets', 'ui', 'button.json'),
      'utf8',
    );
    expect(unchanged).toBe('{}');
  });

  it('rejects an invalid category', async () => {
    let error: unknown;
    try {
      await assetCreateCommand.handler(
        makeContext({ options: optionsFor({ category: 'components' }) }),
      );
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'INVALID_CATEGORY' });
  });

  it('requires an existing library', async () => {
    await fs.rm(join(testDir, 'simplify'), { recursive: true, force: true });

    let error: unknown;
    try {
      await assetCreateCommand.handler(makeContext({ options: optionsFor() }));
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'LIBRARY_NOT_FOUND' });
  });

  it('appends the asset to an existing library manifest', async () => {
    await assetCreateCommand.handler(makeContext({ options: optionsFor() }));
    await assetCreateCommand.handler(
      makeContext({ options: optionsFor({ name: 'Dialog', 'asset-id': 'ui/dialog' }) }),
    );

    const library = (await readManifest(join(testDir, 'simplify', 'library.json'))) as {
      readonly assets: readonly string[];
    };
    const libraryValidation = validateLibraryManifest(library);
    expect(libraryValidation.valid).toBe(true);
    expect(library.assets).toEqual([
      'simplify/assets/ui/example.asset.json',
      'simplify/assets/ui/button.json',
      'simplify/assets/ui/dialog.json',
    ]);
  });

  it('validates generated manifests before writing', async () => {
    await assetCreateCommand.handler(makeContext({ options: optionsFor() }));

    const assetManifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'ui', 'button.json'),
    )) as unknown;
    expect(validateAssetManifest(assetManifest).valid).toBe(true);

    const library = (await readManifest(join(testDir, 'simplify', 'library.json'))) as unknown;
    expect(validateLibraryManifest(library).valid).toBe(true);
  });
});
