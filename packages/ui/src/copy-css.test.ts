import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { removeStaleGeneratedOutputs } from '../scripts/copy-css.mjs';

async function createTree(root: string): Promise<{ source: string; output: string }> {
  const source = path.join(root, 'src');
  const output = path.join(root, 'dist');
  await mkdir(path.join(source, 'nested'), { recursive: true });
  await mkdir(path.join(output, 'nested'), { recursive: true });

  await writeFile(path.join(source, 'live.ts'), '', 'utf8');
  await writeFile(path.join(source, 'live-view.tsx'), '', 'utf8');
  await writeFile(path.join(source, 'nested', 'live.ts'), '', 'utf8');

  for (const file of ['live.js', 'live.d.ts', 'live.js.map', 'live.d.ts.map']) {
    await writeFile(path.join(output, file), '', 'utf8');
  }
  for (const file of ['live-view.js', 'live-view.d.ts']) {
    await writeFile(path.join(output, file), '', 'utf8');
  }
  await writeFile(path.join(output, 'nested', 'live.js'), '', 'utf8');
  await writeFile(path.join(output, 'nested', 'live.d.ts'), '', 'utf8');

  for (const file of ['orphan.js', 'orphan.js.map', 'orphan.d.ts', 'orphan.d.ts.map']) {
    await writeFile(path.join(output, file), '', 'utf8');
  }
  await writeFile(path.join(output, 'nested', 'orphan.js'), '', 'utf8');
  await writeFile(path.join(output, 'orphan.module.css'), '', 'utf8');

  return { source, output };
}

describe('copy-css generated output cleanup', () => {
  it('removes compiled artifacts with no source and keeps live artifacts and CSS', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sd-copy-css-'));
    try {
      const { source, output } = await createTree(root);
      await removeStaleGeneratedOutputs(source, output);

      for (const file of [
        'live.js',
        'live.d.ts',
        'live.js.map',
        'live.d.ts.map',
        'live-view.js',
        'live-view.d.ts',
        'nested/live.js',
        'nested/live.d.ts',
        'orphan.module.css',
      ]) {
        await expect(access(path.join(output, file))).resolves.toBeUndefined();
      }
      for (const file of [
        'orphan.js',
        'orphan.js.map',
        'orphan.d.ts',
        'orphan.d.ts.map',
        'nested/orphan.js',
      ]) {
        await expect(access(path.join(output, file))).rejects.toThrow();
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does nothing when the output directory does not exist', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sd-copy-css-'));
    try {
      await expect(
        removeStaleGeneratedOutputs(path.join(root, 'src'), path.join(root, 'missing')),
      ).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
