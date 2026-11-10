import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@simplify-dev/tooling', () => ({
  validateAssetManifest: vi.fn(),
  validateLibrary: vi.fn(),
}));

import { assetValidateCommand } from '../src/commands/asset-validate.js';
import type { CommandContext } from '../src/cli.js';
import { validateAssetManifest, validateLibrary } from '@simplify-dev/tooling';

const mockedValidateAssetManifest = vi.mocked(validateAssetManifest);
const mockedValidateLibrary = vi.mocked(validateLibrary);

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

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockedValidateAssetManifest.mockReset();
  mockedValidateLibrary.mockReset();
  mockedValidateAssetManifest.mockResolvedValue({ valid: true, issues: [] });
  mockedValidateLibrary.mockResolvedValue({ valid: true, assets: [], issues: [] });
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('asset validate', () => {
  it('rejects an unknown asset subcommand', async () => {
    let error: unknown;
    try {
      await assetValidateCommand.handler(makeContext({ args: ['create'] }));
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: 'UNKNOWN_ASSET_SUBCOMMAND' });
    expect(mockedValidateAssetManifest).not.toHaveBeenCalled();
    expect(mockedValidateLibrary).not.toHaveBeenCalled();
  });

  it('rejects extra arguments', async () => {
    let error: unknown;
    try {
      await assetValidateCommand.handler(makeContext({ args: ['validate', 'unexpected'] }));
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mockedValidateAssetManifest).not.toHaveBeenCalled();
  });

  it('shows intent in dry-run mode', async () => {
    await assetValidateCommand.handler(
      makeContext({ args: ['validate'], options: { path: '/tmp/asset.json' }, dryRun: true }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run] Would validate asset at "/tmp/asset.json".'),
    );
    expect(mockedValidateAssetManifest).toHaveBeenCalledWith('/tmp/asset.json');
  });

  it('validates a single asset manifest and reports success', async () => {
    await assetValidateCommand.handler(
      makeContext({ args: ['validate'], options: { path: '/tmp/asset.json' } }),
    );
    expect(mockedValidateAssetManifest).toHaveBeenCalledWith('/tmp/asset.json');
    expect(mockedValidateLibrary).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Validated asset manifest at "/tmp/asset.json".'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed'));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports per-issue errors for an invalid asset manifest', async () => {
    mockedValidateAssetManifest.mockResolvedValue({
      valid: false,
      issues: [
        { path: '/version', message: 'must be a semver version', keyword: 'invalidVersion' },
      ],
    });
    let error: unknown;
    try {
      await assetValidateCommand.handler(
        makeContext({ args: ['validate'], options: { path: '/tmp/asset.json' } }),
      );
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: 'VALIDATION_FAILED', message: 'Validation failed.' });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('/version must be a semver version'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Validation failed with 1 issue(s).'),
    );
  });

  it('emits JSON output for a single asset when --json is set', async () => {
    mockedValidateAssetManifest.mockResolvedValue({ valid: true, issues: [] });
    const result = {
      valid: true,
      library: undefined,
      assets: [{ manifest: '/tmp/asset.json', valid: true, issues: [] }],
      issues: [],
    };
    await assetValidateCommand.handler(
      makeContext({ args: ['validate'], options: { path: '/tmp/asset.json' }, json: true }),
    );
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
  });

  it('validates an entire library when --library is set', async () => {
    mockedValidateLibrary.mockResolvedValue({
      valid: true,
      assets: [{ manifest: 'ui/button/asset.json', valid: true, issues: [] }],
      issues: [],
    });
    await assetValidateCommand.handler(
      makeContext({ args: ['validate'], options: { path: '/tmp', library: true } }),
    );
    expect(mockedValidateLibrary).toHaveBeenCalledWith('/tmp');
    expect(mockedValidateAssetManifest).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed (1 asset(s)).'));
  });

  it('throws when library validation fails', async () => {
    mockedValidateLibrary.mockResolvedValue({
      valid: false,
      assets: [],
      issues: [
        {
          path: '/assets/0',
          message: 'Asset manifest "ui/button/asset.json" does not exist.',
          keyword: 'missingAssetManifest',
          manifest: 'ui/button/asset.json',
        },
      ],
    });
    let error: unknown;
    try {
      await assetValidateCommand.handler(
        makeContext({ args: ['validate'], options: { path: '/tmp', library: true } }),
      );
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('defaults to the current working directory when --path is omitted', async () => {
    const cwd = process.cwd();
    await assetValidateCommand.handler(makeContext({ args: ['validate'] }));
    expect(mockedValidateAssetManifest).toHaveBeenCalledWith(cwd);
  });
});
