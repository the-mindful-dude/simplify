import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadConfig,
  saveConfig,
  initConfig,
  validateConfig,
  getInstallationPaths,
  type ValidationResult,
  type ProjectConfiguration,
} from '../src/installation/config.js';

let createdDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'simplify-config-test-'));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  createdDirs = [];
});

function writeConfig(dir: string, config: unknown): void {
  writeFileSync(join(dir, 'simplify.config.json'), JSON.stringify(config), 'utf8');
}

const validConfig: ProjectConfiguration = {
  schemaVersion: 1,
  packageManager: 'pnpm',
  installation: {
    defaultMode: 'hybrid',
    paths: {
      ui: '@/components/ui',
      blocks: '@/components/blocks',
      logic: '@/lib',
      integrations: '@/lib/integrations',
      hooks: '@/hooks',
      styles: '@/styles',
    },
  },
};

describe('loadConfig', () => {
  it('loads a valid simplify.config.json', () => {
    const dir = makeTempDir();
    writeConfig(dir, validConfig);
    const config = loadConfig(dir);
    expect(config.schemaVersion).toBe(1);
    expect(config.packageManager).toBe('pnpm');
    expect(config.installation.defaultMode).toBe('hybrid');
    expect(config.installation.paths.ui).toBe('@/components/ui');
  });

  it('throws when the config file is missing', () => {
    const dir = makeTempDir();
    expect(() => loadConfig(dir)).toThrow('No simplify.config.json found');
  });

  it('throws when the config file is invalid JSON', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'simplify.config.json'), '{ not json', 'utf8');
    expect(() => loadConfig(dir)).toThrow('Failed to parse');
  });

  it('throws when the config fails schema validation', () => {
    const dir = makeTempDir();
    writeConfig(dir, { schemaVersion: 99 });
    expect(() => loadConfig(dir)).toThrow('Invalid simplify.config.json');
  });
});

describe('validateConfig', () => {
  it('returns valid for a well-formed config', () => {
    const result: ValidationResult<ProjectConfiguration> = validateConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.value).toEqual(validConfig);
    expect(result.issues).toEqual([]);
  });

  it('returns issues for an invalid config', () => {
    const result = validateConfig({ schemaVersion: 'not-a-number' });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.value).toBeUndefined();
  });
});

describe('initConfig', () => {
  it('generates a minimal config with default paths', () => {
    const config = initConfig({ language: 'typescript', framework: 'next.js' });
    expect(config.schemaVersion).toBe(1);
    expect(config.installation.defaultMode).toBe('hybrid');
    expect(config.installation.paths).toEqual({
      ui: '@/components/ui',
      blocks: '@/components/blocks',
      logic: '@/lib',
      integrations: '@/lib/integrations',
      hooks: '@/hooks',
      styles: '@/styles',
    });
  });

  it('uses the detected package manager', () => {
    const config = initConfig({ language: 'typescript', packageManager: 'npm' });
    expect(config.packageManager).toBe('npm');
  });

  it('defaults package manager to pnpm', () => {
    const config = initConfig({ language: 'typescript' });
    expect(config.packageManager).toBe('pnpm');
  });
});

describe('getInstallationPaths', () => {
  it('returns configured paths', () => {
    const config: ProjectConfiguration = {
      ...validConfig,
      installation: {
        ...validConfig.installation,
        paths: {
          ...validConfig.installation.paths,
          ui: '@/custom/ui',
        },
      },
    };
    const paths = getInstallationPaths(config);
    expect(paths.ui).toBe('@/custom/ui');
    expect(paths.logic).toBe('@/lib');
  });

  it('falls back to default paths', () => {
    const paths = getInstallationPaths({
      schemaVersion: 1,
      installation: {
        defaultMode: 'package',
        paths: {
          ui: '@/components/ui',
          blocks: '@/components/blocks',
          logic: '@/lib',
          integrations: '@/lib/integrations',
          hooks: '@/hooks',
          styles: '@/styles',
        },
      },
    });
    expect(paths).toEqual({
      ui: '@/components/ui',
      blocks: '@/components/blocks',
      logic: '@/lib',
      integrations: '@/lib/integrations',
      hooks: '@/hooks',
      styles: '@/styles',
    });
  });
});

describe('saveConfig and round-trip', () => {
  it('saves a config and loads it back', () => {
    const dir = makeTempDir();
    saveConfig(validConfig, dir);
    const loaded = loadConfig(dir);
    expect(loaded).toEqual(validConfig);
  });
});
