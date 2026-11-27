import { execFileSync } from 'node:child_process';
import { access, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(packageRoot, 'src');
const distRoot = path.join(packageRoot, 'dist');
const cssModuleSuffix = '.module.css';

async function findCssModules(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findCssModules(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(cssModuleSuffix)) {
      found.push(entryPath);
    }
  }
  return found;
}

function distPathFor(source: string): string {
  return path.join(distRoot, path.relative(srcRoot, source));
}

function buildUiPackage(): void {
  execFileSync('pnpm', ['run', 'build'], { cwd: packageRoot, stdio: 'pipe' });
}

describe('UI package build output', () => {
  beforeAll(buildUiPackage, 120_000);

  it('emits every src CSS module into dist with the same relative path and content', async () => {
    const sources = await findCssModules(srcRoot);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const emitted = await readFile(distPathFor(source), 'utf8');
      expect(emitted).toBe(await readFile(source, 'utf8'));
    }
  });

  it('removes stale CSS modules from dist on a clean rebuild', async () => {
    const stale = path.join(distRoot, 'internal', '__stale_regression.module.css');
    await writeFile(stale, '.stale { color: red; }\n', 'utf8');
    try {
      buildUiPackage();
      await expect(access(stale)).rejects.toThrow();
      for (const source of await findCssModules(srcRoot)) {
        await expect(access(distPathFor(source))).resolves.toBeUndefined();
      }
    } finally {
      await rm(stale, { force: true });
    }
  }, 120_000);
});
