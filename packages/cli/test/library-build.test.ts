import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { run } from '../src/cli.js';

vi.mock('@simplify-dev/tooling', () => ({
  buildLibrary: vi.fn(),
}));

import { buildLibrary } from '@simplify-dev/tooling';

const mockBuildLibrary = buildLibrary as unknown as ReturnType<typeof vi.fn>;

const buildResult = {
  artifacts: [
    {
      path: '/tmp/lib/out/src/button.tsx',
      target: 'src/button.tsx',
      hash: 'sha256-abc123',
      size: 42,
    },
  ],
  metadata: {
    schemaVersion: 1,
    libraryId: 'ui-library',
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceCommitSha: 'abc123',
    assets: [],
    files: [],
    publicationRecord: {},
  },
  publicationRecord: {},
  deterministic: true,
};

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockBuildLibrary.mockReset();
  mockBuildLibrary.mockResolvedValue(buildResult);
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('library-build command', () => {
  it('builds a library and prints a summary', async () => {
    const code = await run(['library-build', '--path', '/tmp/lib']);

    expect(code).toBe(0);
    expect(mockBuildLibrary).toHaveBeenCalledTimes(1);
    expect(mockBuildLibrary).toHaveBeenCalledWith('/tmp/lib', {
      libraryRoot: '/tmp/lib',
      outputDir: './dist/simplify-build',
      dryRun: false,
      version: undefined,
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Library: ui-library'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Version: 1.0.0'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Files included: 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Deterministic: true'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Source commit: abc123'));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Library built: 1 artifact(s) in ./dist/simplify-build'),
    );
  });

  it('supports output-dir, version and dry-run', async () => {
    const code = await run([
      'library-build',
      '--path',
      '/tmp/lib',
      '--output-dir',
      '/tmp/out',
      '--version',
      '2.0.0',
      '--dry-run',
    ]);

    expect(code).toBe(0);
    expect(mockBuildLibrary).toHaveBeenCalledWith('/tmp/lib', {
      libraryRoot: '/tmp/lib',
      outputDir: '/tmp/out',
      dryRun: true,
      version: '2.0.0',
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run] Would build library.'));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dry-run complete. No files were written.'),
    );
  });

  it('outputs json when --json is passed', async () => {
    const code = await run(['library-build', '--path', '/tmp/lib', '--json']);

    expect(code).toBe(0);
    const jsonCall = logSpy.mock.calls.find((args) => {
      if (typeof args[0] !== 'string') {
        return false;
      }
      try {
        return JSON.parse(args[0]!).metadata?.libraryId === 'ui-library';
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.metadata.libraryId).toBe('ui-library');
    expect(parsed.metadata.version).toBe('1.0.0');
    expect(parsed.deterministic).toBe(true);
  });

  it('rejects positional arguments', async () => {
    const code = await run(['library-build', 'extra']);

    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('library-build does not accept arguments: extra'),
    );
    expect(mockBuildLibrary).not.toHaveBeenCalled();
  });

  it('reports a build failure', async () => {
    mockBuildLibrary.mockRejectedValue(new Error('missing manifest'));
    const code = await run(['library-build', '--path', '/tmp/lib']);

    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to build library: missing manifest'),
    );
  });
});
