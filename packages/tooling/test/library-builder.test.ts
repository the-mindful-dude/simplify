import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { buildLibrary, type BuildResult } from '../src/index.js';

async function writeFileRecursive(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

const libraryManifest = {
  schemaVersion: 1,
  id: 'ui-library',
  name: 'UI Library',
  description: 'A collection of UI assets.',
  version: '1.2.3',
  license: 'MIT',
  repository: 'https://github.com/simplify-dev/ui-library',
  assets: ['assets/ui/button/manifest.json'],
  publishing: {
    include: ['src/**', 'assets/**', 'simplify/**'],
    exclude: ['src/secret.ts'],
  },
};

const assetManifest = {
  schemaVersion: 1,
  id: 'ui/button',
  category: 'ui',
  name: 'Button',
  description: 'Accessible button primitive.',
  version: '1.2.3',
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
          { source: 'src/button.tsx', target: 'src/components/ui/button.tsx' },
          { source: 'src/secret.ts', target: 'src/components/ui/secret.ts' },
        ],
      },
    ],
  },
};

async function createFixture(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'simplify-build-test-'));
  await writeFileRecursive(join(root, 'simplify', 'library.json'), JSON.stringify(libraryManifest));
  await writeFileRecursive(
    join(root, 'assets', 'ui', 'button', 'manifest.json'),
    JSON.stringify(assetManifest),
  );
  await writeFileRecursive(join(root, 'src', 'button.tsx'), 'export const Button = () => null;\n');
  await writeFileRecursive(join(root, 'src', 'secret.ts'), 'export const secret = "s3cret";\n');
  await writeFileRecursive(join(root, '.env'), 'SECRET=1\n');
  await writeFileRecursive(join(root, '.env.local'), 'SECRET=2\n');
  await writeFileRecursive(join(root, 'node_modules', 'pkg', 'index.js'), 'console.log("x");\n');
  await writeFileRecursive(join(root, 'dist', 'bundle.js'), 'console.log("dist");\n');
  await writeFileRecursive(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  await writeFileRecursive(
    join(root, '.git', 'refs', 'heads', 'main'),
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\n',
  );
  for (const [file, content] of Object.entries(extra)) {
    await writeFileRecursive(join(root, file), content);
  }
  return root;
}

describe('buildLibrary', () => {
  let root: string | null = null;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = null;
    }
  });

  it('builds a library and includes required source files and manifests', async () => {
    root = await createFixture();
    const outputDir = join(root, 'out');
    const result = await buildLibrary(root, { outputDir });

    expect(result.deterministic).toBe(true);
    expect(result.metadata.libraryId).toBe('ui-library');
    expect(result.metadata.version).toBe('1.2.3');
    expect(result.metadata.sourceCommitSha).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');

    const targets = result.artifacts.map((artifact) => artifact.target);
    expect(targets).toContain('src/button.tsx');
    expect(targets).toContain('simplify/library.json');
    expect(targets).toContain('assets/ui/button/manifest.json');

    for (const artifact of result.artifacts) {
      expect(artifact.hash).toMatch(/^sha256-[A-Za-z0-9+/]+={0,2}$/);
      expect(artifact.size).toBeGreaterThan(0);
      expect(artifact.path.startsWith(outputDir)).toBe(true);
    }
  });

  it('excludes secrets, env files, git internals, node_modules and dist', async () => {
    root = await createFixture();
    const result = await buildLibrary(root, { outputDir: join(root, 'out') });

    const targets = result.artifacts.map((artifact) => artifact.target);
    expect(targets).not.toContain('.env');
    expect(targets).not.toContain('.env.local');
    expect(targets).not.toContain('.git/HEAD');
    expect(targets).not.toContain('node_modules/pkg/index.js');
    expect(targets).not.toContain('dist/bundle.js');
    expect(targets).not.toContain('src/secret.ts');
  });

  it('produces identical artifacts for the same source revision (deterministic)', async () => {
    root = await createFixture();
    const first = await buildLibrary(root, { outputDir: join(root, 'out') });
    const second = await buildLibrary(root, { outputDir: join(root, 'out') });

    expect(first.deterministic).toBe(true);
    expect(second.deterministic).toBe(true);
    expect(first.artifacts).toEqual(second.artifacts);
    expect(first.metadata.files).toEqual(second.metadata.files);
    expect(first.publicationRecord.source.commitSha).toBe(
      second.publicationRecord.source.commitSha,
    );
  });

  it('is non-deterministic when no source commit SHA is available', async () => {
    root = await createFixture();
    await rm(join(root, '.git'), { recursive: true, force: true });
    const result = await buildLibrary(root, { outputDir: join(root, 'out') });

    expect(result.deterministic).toBe(false);
    expect(result.metadata.sourceCommitSha).toBeNull();
    expect(result.publicationRecord.source.commitSha).toBe(
      '0000000000000000000000000000000000000000',
    );
  });

  it('uses GITHUB_SHA when present even without a .git directory', async () => {
    const original = process.env.GITHUB_SHA;
    process.env.GITHUB_SHA = 'github-sha-1234';
    try {
      root = await createFixture();
      await rm(join(root, '.git'), { recursive: true, force: true });
      const result = await buildLibrary(root, { outputDir: join(root, 'out') });

      expect(result.deterministic).toBe(true);
      expect(result.metadata.sourceCommitSha).toBe('github-sha-1234');
      expect(result.publicationRecord.source.commitSha).toBe('github-sha-1234');
    } finally {
      if (original === undefined) {
        delete process.env.GITHUB_SHA;
      } else {
        process.env.GITHUB_SHA = original;
      }
    }
  });

  it('supports dry-run without writing files', async () => {
    root = await createFixture();
    const outputDir = join(root, 'out');
    const result = await buildLibrary(root, { outputDir, dryRun: true });

    expect(result.deterministic).toBe(true);
    expect(result.artifacts.length).toBeGreaterThan(0);

    let outputExists = false;
    try {
      await readFile(join(outputDir, 'build-metadata.json'), 'utf8');
      outputExists = true;
    } catch {
      outputExists = false;
    }
    expect(outputExists).toBe(false);
  });

  it('overrides the version when provided', async () => {
    root = await createFixture();
    const result = await buildLibrary(root, { outputDir: join(root, 'out'), version: '9.9.9' });

    expect(result.metadata.version).toBe('9.9.9');
    expect(result.publicationRecord.version).toBe('9.9.9');
  });

  it('produces registry-ready metadata and a valid publication record', async () => {
    root = await createFixture();
    const result = await buildLibrary(root, { outputDir: join(root, 'out') });

    const metadataJson = JSON.stringify(result.metadata);
    expect(() => JSON.parse(metadataJson)).not.toThrow();

    expect(result.publicationRecord.immutable).toBe(true);
    expect(result.publicationRecord.schemaVersion).toBe(1);
    expect(result.publicationRecord.libraryId).toBe('ui-library');
    expect(result.publicationRecord.publishedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(result.publicationRecord.artifact.integrity).toMatch(/^sha256-/);

    const buttonEntry = result.metadata.assets.find((entry) => entry.manifest.id === 'ui/button');
    expect(buttonEntry).toBeDefined();
    expect(buttonEntry!.files.map((file) => file.target)).toContain('src/button.tsx');
    expect(buttonEntry!.files.map((file) => file.target)).not.toContain('src/secret.ts');
  });

  it('fails when no library manifest is present', async () => {
    root = await mkdtemp(join(tmpdir(), 'simplify-build-empty-'));
    await expect(buildLibrary(root)).rejects.toThrow(/No library manifest found/);
    await rm(root, { recursive: true, force: true });
    root = null;
  });
});
