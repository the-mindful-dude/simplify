import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { buildLibrary } from '../src/index.js';

async function writeFileRecursive(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

const VALID_SHA = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

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
  await writeFileRecursive(join(root, '.git', 'refs', 'heads', 'main'), `${VALID_SHA}\n`);
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
    expect(result.metadata.sourceCommitSha).toBe(VALID_SHA);

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
    expect(first.provenance.source.commitSha).toBe(second.provenance.source.commitSha);
  });

  // Previously asserted a zero SHA as valid provenance; that assertion encoded
  // the defect, so it now verifies the fail-fast structured error instead.
  it('rejects instead of emitting a zero SHA when no source commit SHA is available', async () => {
    const originalSha = process.env.GITHUB_SHA;
    delete process.env.GITHUB_SHA;
    try {
      root = await createFixture();
      await rm(join(root, '.git'), { recursive: true, force: true });

      await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
        name: 'PublicationProvenanceError',
        code: 'publication_provenance_unavailable',
        message: expect.stringContaining('commitSha'),
        missing: expect.arrayContaining([expect.stringContaining('commitSha')]),
      });

      let outputExists = false;
      try {
        await readFile(join(root, 'out', 'build-metadata.json'), 'utf8');
        outputExists = true;
      } catch {
        outputExists = false;
      }
      expect(outputExists).toBe(false);
    } finally {
      if (originalSha === undefined) {
        delete process.env.GITHUB_SHA;
      } else {
        process.env.GITHUB_SHA = originalSha;
      }
    }
  });

  // Previously treated a non-hex string as a valid SHA; that assertion encoded
  // the defect. A malformed GITHUB_SHA is now a structured provenance error.
  it('rejects a malformed GITHUB_SHA instead of treating it as provenance', async () => {
    const original = process.env.GITHUB_SHA;
    process.env.GITHUB_SHA = 'github-sha-1234';
    try {
      root = await createFixture();
      await rm(join(root, '.git'), { recursive: true, force: true });

      await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
        name: 'PublicationProvenanceError',
        code: 'publication_provenance_unavailable',
        message: expect.stringContaining('commitSha'),
        missing: expect.arrayContaining([expect.stringContaining('GITHUB_SHA')]),
      });

      let outputExists = false;
      try {
        await readFile(join(root, 'out', 'build-metadata.json'), 'utf8');
        outputExists = true;
      } catch {
        outputExists = false;
      }
      expect(outputExists).toBe(false);
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
    expect(result.provenance.artifact.url).toBe(
      'https://registry.simplify.dev/libraries/ui-library/@9.9.9',
    );
  });

  it('produces registry-ready metadata and an unverified provenance candidate', async () => {
    root = await createFixture();
    const result = await buildLibrary(root, { outputDir: join(root, 'out') });

    const metadataJson = JSON.stringify(result.metadata);
    expect(() => JSON.parse(metadataJson)).not.toThrow();
    expect(metadataJson).not.toContain('"immutable"');

    expect(result.provenance.source.commitSha).toBe(VALID_SHA);
    expect(result.provenance.publisher).toBe('simplify-dev');
    expect(result.provenance.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(result.provenance.artifact.integrity).toMatch(/^sha256-/);
    expect('immutable' in result.provenance).toBe(false);
    expect('verified' in result.provenance).toBe(false);

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

  describe('publication provenance', () => {
    async function withEnv(
      overrides: Record<string, string | undefined>,
      run: () => Promise<void>,
    ): Promise<void> {
      const previous = new Map<string, string | undefined>();
      for (const [key, value] of Object.entries(overrides)) {
        previous.set(key, process.env[key]);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      try {
        await run();
      } finally {
        for (const [key, value] of previous) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    }

    it('records real repository identity, commit SHA and publisher when provenance is available', async () => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture();
        const result = await buildLibrary(root, { outputDir: join(root, 'out') });
        const source = result.provenance.source;

        expect(source.owner).toBe('simplify-dev');
        expect(source.name).toBe('ui-library');
        expect(source.url).toBe('https://github.com/simplify-dev/ui-library');
        expect(source.repositoryId).toBe('https://github.com/simplify-dev/ui-library');
        expect(source.commitSha).toBe(VALID_SHA);
        expect(result.provenance.publisher).toBe('simplify-dev');
        expect(source.owner).not.toBe('unknown');
        expect(result.provenance.publisher).not.toBe('unknown');
        expect(source.commitSha).not.toBe('0000000000000000000000000000000000000000');
      });
    });

    it('uses the CI actor as publisher when GITHUB_ACTOR is available', async () => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: 'ci-publisher' }, async () => {
        root = await createFixture();
        const result = await buildLibrary(root, { outputDir: join(root, 'out') });

        expect(result.provenance.publisher).toBe('ci-publisher');
      });
    });

    it('uses a declared maintainer as publisher when no CI actor is available', async () => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture({
          'simplify/library.json': JSON.stringify({
            ...libraryManifest,
            maintainers: [{ name: 'Library Maintainer' }],
          }),
        });
        const result = await buildLibrary(root, { outputDir: join(root, 'out') });

        expect(result.provenance.publisher).toBe('Library Maintainer');
      });
    });

    it('rejects with an actionable provenance error when no commit SHA is available', async () => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture();
        await rm(join(root, '.git'), { recursive: true, force: true });

        await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
          name: 'PublicationProvenanceError',
          code: 'publication_provenance_unavailable',
          message: expect.stringContaining('commitSha'),
          missing: expect.arrayContaining([expect.stringContaining('commitSha')]),
        });
      });
    });

    it('rejects with an actionable provenance error when repository identity is unavailable', async () => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture({
          'simplify/library.json': JSON.stringify({ ...libraryManifest, repository: undefined }),
        });

        await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
          name: 'PublicationProvenanceError',
          code: 'publication_provenance_unavailable',
          message: expect.stringContaining('repository'),
          missing: expect.arrayContaining([expect.stringContaining('repository')]),
        });
      });
    });

    it('accepts a valid 40-hex GITHUB_SHA without a .git directory and normalizes to lowercase', async () => {
      await withEnv(
        {
          GITHUB_SHA: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
          GITHUB_ACTOR: undefined,
        },
        async () => {
          root = await createFixture();
          await rm(join(root, '.git'), { recursive: true, force: true });
          const result = await buildLibrary(root, { outputDir: join(root, 'out') });

          expect(result.deterministic).toBe(true);
          expect(result.provenance.source.commitSha).toBe(VALID_SHA);
          expect(result.metadata.sourceCommitSha).toBe(VALID_SHA);
        },
      );
    });

    it.each([
      ['wrong length (39 hex)', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b'],
      ['wrong length (41 hex)', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c'],
      ['non-hex characters', 'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'],
      ['all-zero SHA', '0000000000000000000000000000000000000000'],
    ])('rejects invalid GITHUB_SHA: %s', async (_label, sha) => {
      await withEnv({ GITHUB_SHA: sha, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture();
        await rm(join(root, '.git'), { recursive: true, force: true });

        await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
          name: 'PublicationProvenanceError',
          code: 'publication_provenance_unavailable',
          missing: expect.arrayContaining([expect.stringContaining('GITHUB_SHA')]),
        });
      });
    });

    it.each([
      ['https://evil.example/o/n', 'https://evil.example/o/n'],
      ['git@evil.example:o/n.git', 'git@evil.example:o/n.git'],
      ['github.com.evil host', 'https://github.com.evil/o/n'],
      ['credentials in URL', 'https://u:p@github.com/o/n'],
      ['port in URL', 'https://github.com:8443/o/n'],
      ['query in URL', 'https://github.com/o/n?x=1'],
      ['one-segment path', 'https://github.com/only-owner'],
      ['dot segment', 'https://github.com/o/.'],
      ['dotdot segment', 'https://github.com/o/..'],
    ])('rejects disallowed repository identity: %s', async (_label, repository) => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture({
          'simplify/library.json': JSON.stringify({ ...libraryManifest, repository }),
        });

        await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
          name: 'PublicationProvenanceError',
          code: 'publication_provenance_unavailable',
          missing: expect.arrayContaining([expect.stringContaining('source.repository identity')]),
        });
      });
    });

    it.each([
      ['https URL', 'https://github.com/simplify-dev/ui-library', 'simplify-dev', 'ui-library'],
      ['git scp form', 'git@github.com:simplify-dev/ui-library.git', 'simplify-dev', 'ui-library'],
      ['bare owner/name', 'simplify-dev/ui-library', 'simplify-dev', 'ui-library'],
    ])('accepts valid repository identity form: %s', async (_label, repository, owner, name) => {
      await withEnv({ GITHUB_SHA: undefined, GITHUB_ACTOR: undefined }, async () => {
        root = await createFixture({
          'simplify/library.json': JSON.stringify({ ...libraryManifest, repository }),
        });
        const result = await buildLibrary(root, { outputDir: join(root, 'out') });

        expect(result.provenance.source.owner).toBe(owner);
        expect(result.provenance.source.name).toBe(name);
        expect(result.provenance.source.url).toBe(`https://github.com/${owner}/${name}`);
        expect(result.provenance.source.repositoryId).toBe(`https://github.com/${owner}/${name}`);
      });
    });

    it('rejects when GITHUB_ACTIONS is true and GITHUB_REPOSITORY mismatches manifest repository', async () => {
      await withEnv(
        {
          GITHUB_SHA: undefined,
          GITHUB_ACTOR: undefined,
          GITHUB_ACTIONS: 'true',
          GITHUB_REPOSITORY: 'other-org/other-repo',
        },
        async () => {
          root = await createFixture();

          await expect(buildLibrary(root, { outputDir: join(root, 'out') })).rejects.toMatchObject({
            name: 'PublicationProvenanceError',
            code: 'publication_provenance_unavailable',
            missing: expect.arrayContaining([expect.stringContaining('GITHUB_REPOSITORY')]),
          });
        },
      );
    });

    it('accepts when GITHUB_ACTIONS is true and GITHUB_REPOSITORY matches manifest repository', async () => {
      await withEnv(
        {
          GITHUB_SHA: undefined,
          GITHUB_ACTOR: undefined,
          GITHUB_ACTIONS: 'true',
          GITHUB_REPOSITORY: 'simplify-dev/ui-library',
        },
        async () => {
          root = await createFixture();
          const result = await buildLibrary(root, { outputDir: join(root, 'out') });

          expect(result.provenance.source.owner).toBe('simplify-dev');
          expect(result.provenance.source.name).toBe('ui-library');
        },
      );
    });

    it('preserves actor/maintainer/owner publisher precedence when GITHUB_ACTIONS is absent', async () => {
      await withEnv(
        {
          GITHUB_SHA: undefined,
          GITHUB_ACTOR: 'ci-publisher',
          GITHUB_ACTIONS: undefined,
          GITHUB_REPOSITORY: 'other-org/other-repo',
        },
        async () => {
          root = await createFixture({
            'simplify/library.json': JSON.stringify({
              ...libraryManifest,
              maintainers: [{ name: 'Library Maintainer' }],
            }),
          });
          const result = await buildLibrary(root, { outputDir: join(root, 'out') });

          // Precedence unchanged: GITHUB_ACTOR wins even if GITHUB_REPOSITORY differs
          // (correlation only applies when GITHUB_ACTIONS === 'true').
          expect(result.provenance.publisher).toBe('ci-publisher');
        },
      );
    });
  });
});
