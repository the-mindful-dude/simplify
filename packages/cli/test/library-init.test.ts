import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { libraryInitCommand } from '../src/commands/library-init.js';
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

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-library-init-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(async () => {
  logSpy.mockRestore();
  await fs.rm(testDir, { recursive: true, force: true });
});

function optionsFor(
  extra: Record<string, string | boolean> = {},
): Record<string, string | boolean> {
  return {
    name: 'Test Library',
    description: 'A test library for scaffolding.',
    license: 'MIT',
    category: 'ui',
    'target-dir': testDir,
    ...extra,
  };
}

async function readManifest(path: string): Promise<unknown> {
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw);
}

describe('library-init', () => {
  it('generates a valid library manifest and directory structure', async () => {
    await libraryInitCommand.handler(makeContext({ options: optionsFor() }));

    const manifestPath = join(testDir, 'simplify', 'library.json');
    const manifest = (await readManifest(manifestPath)) as {
      readonly id: string;
      readonly assets: readonly string[];
    };

    const libraryValidation = validateLibraryManifest(manifest);
    expect(libraryValidation.valid).toBe(true);
    expect(libraryValidation.issues).toHaveLength(0);
    expect(manifest.id).toBe('test-library');
    expect(manifest.assets).toContain('simplify/assets/ui/example.asset.json');

    const assetManifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'ui', 'example.asset.json'),
    )) as { readonly id: string; readonly category: string };
    const assetValidation = validateAssetManifest(assetManifest);
    expect(assetValidation.valid).toBe(true);
    expect(assetManifest.id).toBe('ui/example');
    expect(assetManifest.category).toBe('ui');

    await expect(fs.access(join(testDir, 'src', 'index.ts'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'docs', 'getting-started.md'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'examples', 'README.md'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'previews', 'README.md'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'README.md'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'CHANGELOG.md'))).resolves.toBeUndefined();
    await expect(fs.access(join(testDir, 'package.json'))).resolves.toBeUndefined();
  });

  it('defaults category to library', async () => {
    const { category, ...rest } = optionsFor();
    await libraryInitCommand.handler(makeContext({ options: rest }));

    const manifest = (await readManifest(join(testDir, 'simplify', 'library.json'))) as {
      readonly assets: readonly string[];
    };
    expect(manifest.assets).toContain('simplify/assets/library/example.asset.json');
    await expect(
      fs.access(join(testDir, 'simplify', 'assets', 'library')),
    ).resolves.toBeUndefined();
  });

  it('derives the library id from the name', async () => {
    await libraryInitCommand.handler(
      makeContext({ options: optionsFor({ name: 'My Great Library!' }) }),
    );
    const manifest = (await readManifest(join(testDir, 'simplify', 'library.json'))) as {
      readonly id: string;
    };
    expect(manifest.id).toBe('my-great-library');
  });

  it('writes nothing in dry-run mode', async () => {
    await libraryInitCommand.handler(makeContext({ options: optionsFor(), dryRun: true }));

    await expect(fs.access(join(testDir, 'simplify', 'library.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fs.access(join(testDir, 'README.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
  });

  it('refuses to overwrite existing files', async () => {
    await fs.mkdir(join(testDir, 'simplify'), { recursive: true });
    await fs.writeFile(join(testDir, 'simplify', 'library.json'), '{}', 'utf8');

    let error: unknown;
    try {
      await libraryInitCommand.handler(makeContext({ options: optionsFor() }));
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({
      code: 'FILE_EXISTS',
    });
    expect((error as Error).message).toContain('simplify/library.json');

    const unchanged = await fs.readFile(join(testDir, 'simplify', 'library.json'), 'utf8');
    expect(unchanged).toBe('{}');
  });

  it('requires a name', async () => {
    let error: unknown;
    try {
      await libraryInitCommand.handler(makeContext({ options: optionsFor({ name: '' }) }));
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'MISSING_OPTION' });
  });

  it('validates generated manifests before writing', async () => {
    await libraryInitCommand.handler(makeContext({ options: optionsFor() }));

    const manifest = (await readManifest(join(testDir, 'simplify', 'library.json'))) as unknown;
    expect(validateLibraryManifest(manifest).valid).toBe(true);

    const assetManifest = (await readManifest(
      join(testDir, 'simplify', 'assets', 'ui', 'example.asset.json'),
    )) as unknown;
    expect(validateAssetManifest(assetManifest).valid).toBe(true);
  });
});
