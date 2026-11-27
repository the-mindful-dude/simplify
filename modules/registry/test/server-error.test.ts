import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { RegistryDataError } from '../src/errors.js';
import { OnDiskRegistryRepository } from '../src/server/repository.js';

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

describe('on-disk repository error causes', () => {
  it('strips absolute paths from retained client error context', async () => {
    const base = mkdtempSync(join(tmpdir(), 'sd-module-registry-error-'));
    const repoRoot = join(base, 'repo');
    const registryRoot = join(repoRoot, 'registry');
    mkdirSync(registryRoot, { recursive: true });
    const outsideIndex = join(base, 'outside-index.json');
    writeFileSync(
      outsideIndex,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: '2026-01-01T00:00:00.000Z',
        assets: [],
        libraries: [],
      }),
    );
    symlinkSync(outsideIndex, join(registryRoot, 'index.json'));

    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(repoRoot);
    let caught: unknown;
    try {
      await new OnDiskRegistryRepository().getSnapshot();
    } catch (error) {
      caught = error;
    } finally {
      cwd.mockRestore();
      rmSync(base, { recursive: true, force: true });
    }

    expect(caught).toBeInstanceOf(RegistryDataError);
    expect((caught as RegistryDataError).code).toBe('index_read_failed');
    expect((caught as Error).message).not.toContain(base);
    expect(serializedCauseChain(caught)).not.toContain(base);
    expect(JSON.stringify((caught as Error & { cause?: unknown }).cause)).toContain(
      'PATH_ESCAPES_ROOT',
    );
  });
});
