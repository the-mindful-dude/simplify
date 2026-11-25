import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { RegistryClient } from '@simplify-dev/registry';

import { planInstallation } from '../src/installation/planner.js';
import { SourceInstaller } from '../src/installation/source-installer.js';
import type {
  FileChange,
  PlannerOptions,
  ProjectConfiguration,
  ProjectDetectionResult,
} from '../src/installation/types.js';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const registryRoot = join(testDir, '..', '..', '..', 'registry');
const checkedInManifest = join(registryRoot, 'ui', 'button', '@1.0.0', 'asset.json');
const oldDoubledManifest = join(
  registryRoot,
  'assets',
  'ui',
  'ui',
  'button',
  '@1.0.0',
  'manifest.json',
);

const projectConfig: ProjectConfiguration = {
  schemaVersion: 1,
  packageManager: 'pnpm',
  registry: { url: registryRoot },
  installation: {
    defaultMode: 'source',
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

const detectionResult: ProjectDetectionResult = {
  projectRoot: '/test/project',
  language: 'typescript',
  framework: 'react',
  packageManager: 'pnpm',
  versions: { node: '20.0.0', framework: '19.0.0', typescript: '5.0.0' },
  sourceDirectories: ['src'],
  importAliases: { '@': './src' },
  monorepo: { isMonorepo: false },
  simplifyConfig: true,
};

const temporaryDirectories: string[] = [];

function createProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'simplify-cli-registry-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

// Regression guard for the doubled-path defect: the old client resolved
// `assets/ui/ui/button/@1.0.0/manifest.json`, so CLI consumers received a null
// manifest despite the checked-in source-v1 asset. These tests keep both CLI
// consumption surfaces on the real RegistryClient without mocking it.
describe('CLI consumption of the checked-in registry asset', () => {
  it('plans ui/button@1.0.0 from the real manifest', async () => {
    expect(existsSync(checkedInManifest)).toBe(true);
    expect(existsSync(oldDoubledManifest)).toBe(false);

    const options: PlannerOptions = {
      assetId: 'ui/button',
      dryRun: true,
      cwd: createProject(),
    };

    const plan = await planInstallation(options, projectConfig, detectionResult);

    expect(plan.assetId).toBe('ui/button');
    expect(plan.version).toBe('1.0.0');
    expect(plan.installationMode).toBe('source');
    expect(plan.fileChanges).toEqual([
      {
        source: 'src/button.tsx',
        target: 'src/components/ui/button.tsx',
        assetId: 'ui/button',
        status: 'new',
        exists: false,
      },
    ]);
  });

  it('installs the real asset.json through the CLI source installer', async () => {
    const projectRoot = createProject();
    const client = new RegistryClient({ registryRoot });
    const target = 'src/components/ui/button/asset.json';
    const change: FileChange = {
      source: 'asset.json',
      target,
      assetId: 'ui/button',
      status: 'new',
      exists: false,
    };

    const result = await new SourceInstaller({ client }).install({
      assetId: 'ui/button',
      version: '1.0.0',
      files: [change],
      cwd: projectRoot,
      dryRun: false,
      conflictPolicy: 'reject',
    });

    expect(result.filesWritten).toBe(1);
    expect(readFileSync(join(projectRoot, target))).toEqual(readFileSync(checkedInManifest));
  });
});
