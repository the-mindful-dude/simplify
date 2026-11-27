import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { RegistryClient, RegistryClientError } from '../src/client/index.js';

const indexJson = JSON.stringify({
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
  libraries: [],
});

const manifestJson = JSON.stringify({
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
});

const sourceContent = 'export const Button = () => null;\n';

function createRegistry(root: string): void {
  mkdirSync(join(root, 'ui/button/@1.0.0/src'), { recursive: true });
  writeFileSync(join(root, 'index.json'), indexJson);
  writeFileSync(join(root, 'ui/button/@1.0.0/asset.json'), manifestJson);
  writeFileSync(join(root, 'ui/button/@1.0.0/src/button.tsx'), sourceContent);
}

let baseDir: string | undefined;

function fixture(): { base: string; root: string; outside: string } {
  const base = mkdtempSync(join(tmpdir(), 'sd-registry-containment-'));
  baseDir = base;
  const root = join(base, 'registry');
  const outside = join(base, 'outside');
  mkdirSync(outside, { recursive: true });
  createRegistry(root);
  return { base, root, outside };
}

afterEach(() => {
  if (baseDir) {
    rmSync(baseDir, { recursive: true, force: true });
    baseDir = undefined;
  }
});

async function captureClientError(action: () => Promise<unknown>): Promise<RegistryClientError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof RegistryClientError) {
      return error;
    }
    throw new Error(`Expected RegistryClientError, received ${String(error)}`);
  }
  throw new Error('Expected RegistryClientError, but the read succeeded.');
}

function serializedCauseChain(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current !== null && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    parts.push(current instanceof Error ? current.message : JSON.stringify(current));
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(' ');
}

function expectSanitized(error: unknown, base: string): void {
  expect(serializedCauseChain(error)).not.toContain(base);
}

describe('RegistryClient real-path containment', () => {
  it('rejects an out-of-root file symlink in a byte read with PATH_ESCAPES_ROOT', async () => {
    const { base, root, outside } = fixture();
    const outsideFile = join(outside, 'secret.tsx');
    writeFileSync(outsideFile, 'secret');
    const target = join(root, 'ui/button/@1.0.0/src/button.tsx');
    rmSync(target);
    symlinkSync(outsideFile, target);

    const error = await captureClientError(() =>
      new RegistryClient({ registryRoot: root }).getAssetFile(
        'ui/button',
        '1.0.0',
        'src/button.tsx',
      ),
    );

    expect(error.code).toBe('PATH_ESCAPES_ROOT');
    expectSanitized(error, base);
  });

  it('rejects an out-of-root file symlink in a JSON read with PATH_ESCAPES_ROOT', async () => {
    const { base, root, outside } = fixture();
    const outsideManifest = join(outside, 'manifest.json');
    writeFileSync(outsideManifest, manifestJson);
    const target = join(root, 'ui/button/@1.0.0/asset.json');
    rmSync(target);
    symlinkSync(outsideManifest, target);

    const error = await captureClientError(() =>
      new RegistryClient({ registryRoot: root }).getAsset('ui/button', '1.0.0'),
    );

    expect(error.code).toBe('PATH_ESCAPES_ROOT');
    expectSanitized(error, base);
  });

  it('rejects an out-of-root symlink used for the index read', async () => {
    const { base, root, outside } = fixture();
    const outsideIndex = join(outside, 'index.json');
    writeFileSync(outsideIndex, indexJson);
    const target = join(root, 'index.json');
    rmSync(target);
    symlinkSync(outsideIndex, target);

    const error = await captureClientError(() =>
      new RegistryClient({ registryRoot: root }).getRegistryIndex(),
    );

    expect(error.code).toBe('PATH_ESCAPES_ROOT');
    expectSanitized(error, base);
  });

  it('rejects an intermediate directory symlink that resolves outside the root', async () => {
    const { base, root, outside } = fixture();
    const outsideVersion = join(outside, 'version');
    mkdirSync(outsideVersion, { recursive: true });
    writeFileSync(join(outsideVersion, 'asset.json'), manifestJson);
    const target = join(root, 'ui/button/@1.0.0');
    rmSync(target, { recursive: true, force: true });
    symlinkSync(outsideVersion, target);

    const error = await captureClientError(() =>
      new RegistryClient({ registryRoot: root }).getAsset('ui/button', '1.0.0'),
    );

    expect(error.code).toBe('PATH_ESCAPES_ROOT');
    expectSanitized(error, base);
  });

  it('allows a benign in-root symlink for both JSON and byte reads', async () => {
    const { root } = fixture();
    const sharedManifest = join(root, 'shared-asset.json');
    const sharedSource = join(root, 'shared-button.tsx');
    writeFileSync(sharedManifest, manifestJson);
    writeFileSync(sharedSource, sourceContent);
    rmSync(join(root, 'ui/button/@1.0.0/asset.json'));
    rmSync(join(root, 'ui/button/@1.0.0/src/button.tsx'));
    symlinkSync(sharedManifest, join(root, 'ui/button/@1.0.0/asset.json'));
    symlinkSync(sharedSource, join(root, 'ui/button/@1.0.0/src/button.tsx'));

    const client = new RegistryClient({ registryRoot: root });
    const asset = await client.getAsset('ui/button', '1.0.0');
    const bytes = await client.getAssetFile('ui/button', '1.0.0', 'src/button.tsx');

    expect(asset?.id).toBe('ui/button');
    expect(new TextDecoder().decode(bytes)).toBe(sourceContent);
  });

  it('allows a symlinked ancestor of the registry root', async () => {
    const { base } = fixture();
    const realRoot = join(base, 'real-registry');
    const linkedRoot = join(base, 'linked-registry');
    createRegistry(realRoot);
    symlinkSync(realRoot, linkedRoot);

    const client = new RegistryClient({ registryRoot: linkedRoot });
    const asset = await client.getAsset('ui/button', '1.0.0');
    const index = await client.getRegistryIndex();

    expect(asset?.id).toBe('ui/button');
    expect(index.assets[0]?.id).toBe('ui/button');
  });

  it('keeps missing-file semantics and sanitizes the not-found error', async () => {
    const { base, root } = fixture();
    rmSync(join(root, 'ui/button/@1.0.0/asset.json'));

    const client = new RegistryClient({ registryRoot: root });
    await expect(client.getAsset('ui/button', '1.0.0')).resolves.toBeNull();

    const error = await captureClientError(() =>
      client.getAssetFile('ui/button', '1.0.0', 'src/missing.tsx'),
    );
    expect(error.code).toBe('REGISTRY_FILE_NOT_FOUND');
    expectSanitized(error, base);
  });

  it('keeps invalid-JSON semantics and sanitizes the parse error', async () => {
    const { base, root } = fixture();
    writeFileSync(join(root, 'ui/button/@1.0.0/asset.json'), '{ not valid json');

    const error = await captureClientError(() =>
      new RegistryClient({ registryRoot: root }).getAsset('ui/button', '1.0.0'),
    );

    expect(error.code).toBe('REGISTRY_INVALID_JSON');
    expectSanitized(error, base);
  });
});
