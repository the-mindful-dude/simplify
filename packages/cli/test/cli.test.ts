import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { run, parseArgs, CliError, success, error, info, warning } from '../src/cli.js';
import { RegistryClient } from '@simplify-dev/registry';

vi.mock('@simplify-dev/registry', () => {
  const getAsset = vi.fn();
  const getRegistryIndex = vi.fn();
  return {
    RegistryClient: vi.fn().mockImplementation(() => ({ getAsset, getRegistryIndex })),
  };
});

const sharedClient = new RegistryClient() as unknown as {
  getAsset: ReturnType<typeof vi.fn>;
  getRegistryIndex: ReturnType<typeof vi.fn>;
};

const buttonManifest = {
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
};

const registryIndex = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  assets: [],
  libraries: [],
};

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sharedClient.getAsset.mockReset();
  sharedClient.getRegistryIndex.mockReset();
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('parseArgs', () => {
  it('parses command and args', () => {
    const parsed = parseArgs(['add', 'ui/button', '--dry-run', '--json']);
    expect(parsed.command).toBe('add');
    expect(parsed.args).toEqual(['ui/button']);
    expect(parsed.options['dry-run']).toBe(true);
    expect(parsed.options.json).toBe(true);
  });

  it('parses boolean short aliases', () => {
    const parsed = parseArgs(['--version']);
    expect(parsed.options.version).toBe(true);
  });

  it('parses option with value', () => {
    const parsed = parseArgs(['add', 'ui/button', '--version', '1.0.0']);
    expect(parsed.command).toBe('add');
    expect(parsed.options.version).toBe('1.0.0');
    expect(parsed.args).toEqual(['ui/button']);
  });

  it('returns no command when only flags are provided', () => {
    const parsed = parseArgs(['--help']);
    expect(parsed.command).toBeUndefined();
    expect(parsed.options.help).toBe(true);
  });
});

describe('structured output', () => {
  it('formats success', () => {
    success('done', false);
    expect(logSpy).toHaveBeenCalledWith('✓ done');
  });

  it('formats error to console.error', () => {
    error('failed', false);
    expect(errorSpy).toHaveBeenCalledWith('✗ failed');
  });

  it('formats json', () => {
    success('ok', true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ level: 'success', message: 'ok' }));
  });

  it('CliError carries code and message', () => {
    const err = new CliError('something broke', 'BAD_CODE');
    expect(err.message).toBe('something broke');
    expect(err.code).toBe('BAD_CODE');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof CliError).toBe(true);
  });
});

describe('run', () => {
  it('prints version for --version and exits 0', async () => {
    const code = await run(['--version']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith('✓ simplify 0.0.0');
  });

  it('prints version for -v and exits 0', async () => {
    const code = await run(['-v']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith('✓ simplify 0.0.0');
  });

  it('prints help with no command and exits 2', async () => {
    const code = await run([]);
    expect(code).toBe(2);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('simplify <command>'));
  });

  it('prints help for --help and exits 0', async () => {
    const code = await run(['--help']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Global options'));
  });

  it('returns usage error for unknown command', async () => {
    const code = await run(['frobnicate']);
    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown command: "frobnicate".'),
    );
  });

  it('dispatches to init command', async () => {
    const code = await run(['init']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Initializing simplify configuration...'),
    );
  });

  it('supports --dry-run for init', async () => {
    const code = await run(['init', '--dry-run']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run] Would initialize simplify configuration.'),
    );
  });

  it('rejects extra arguments to init', async () => {
    const code = await run(['init', 'foo']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('init does not accept arguments: foo'),
    );
  });

  it('adds an asset in dry-run mode', async () => {
    sharedClient.getAsset.mockResolvedValue(buttonManifest);
    const code = await run(['add', 'ui/button', '--dry-run']);
    expect(code).toBe(0);
    expect(sharedClient.getAsset).toHaveBeenCalledWith('ui/button', undefined);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run] Would add "ui/button"@1.0.0.'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dry-run complete. No changes were made.'),
    );
  });

  it('adds an asset with an explicit version', async () => {
    sharedClient.getAsset.mockResolvedValue(buttonManifest);
    const code = await run(['add', 'ui/button', '--version', '1.0.0']);
    expect(code).toBe(0);
    expect(sharedClient.getAsset).toHaveBeenCalledWith('ui/button', '1.0.0');
  });

  it('errors when asset is not found', async () => {
    sharedClient.getAsset.mockResolvedValue(null);
    const code = await run(['add', 'ui/missing']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Asset not found: "ui/missing".'),
    );
  });

  it('errors when assetId is missing', async () => {
    const code = await run(['add']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing required argument: <assetId>'),
    );
  });

  it('displays asset info', async () => {
    sharedClient.getAsset.mockResolvedValue(buttonManifest);
    const code = await run(['info', 'ui/button']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Asset: ui/button'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Version: 1.0.0'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status: official'));
  });

  it('outputs json for info', async () => {
    sharedClient.getAsset.mockResolvedValue(buttonManifest);
    const code = await run(['info', 'ui/button', '--json']);
    expect(code).toBe(0);
    const jsonCall = logSpy.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0]!.startsWith('{'),
    );
    expect(jsonCall).toBeDefined();
    expect(JSON.parse(jsonCall![0] as string)).toMatchObject(buttonManifest);
  });

  it('errors for unknown asset info', async () => {
    sharedClient.getAsset.mockResolvedValue(null);
    const code = await run(['info', 'ui/nope']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Asset not found: "ui/nope".'));
  });

  it('errors when assetId is missing for info', async () => {
    const code = await run(['info']);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing required argument: <assetId>'),
    );
  });

  it('lists no assets when lock file is missing', async () => {
    const code = await run(['list']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No .simplify/lock.json found'));
  });

  it('doctor fails without a lock file', async () => {
    sharedClient.getRegistryIndex.mockResolvedValue(registryIndex);
    const code = await run(['doctor']);
    expect(code).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('✓ registry:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('✗ lock-file:'));
  });

  it('doctor outputs json', async () => {
    sharedClient.getRegistryIndex.mockResolvedValue(registryIndex);
    const code = await run(['doctor', '--json']);
    expect(code).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"passed": false'));
  });
});
