import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planInstallation } from '../src/installation/planner.js';
import type {
  PlannerOptions,
  ProjectConfiguration,
  ProjectDetectionResult,
} from '../src/installation/types.js';

const mockGetAsset = vi.hoisted(() => vi.fn());
const mockGetAssetFile = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());

vi.mock('@simplify-dev/registry', () => {
  class MockRegistryClient {
    getAsset = mockGetAsset;
    getAssetFile = mockGetAssetFile;
  }

  class MockDependencyResolver {
    resolve = mockResolve;
  }

  return {
    RegistryClient: MockRegistryClient,
    DependencyResolver: MockDependencyResolver,
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => new Uint8Array()),
  };
});

import { existsSync, readFileSync } from 'node:fs';

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

const baseProjectConfig: ProjectConfiguration = {
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

const baseDetectionResult: ProjectDetectionResult = {
  projectRoot: '/test/project',
  language: 'typescript',
  framework: 'react',
  packageManager: 'pnpm',
  versions: { node: '20.0.0', framework: '18.0.0', typescript: '5.0.0' },
  sourceDirectories: ['src'],
  importAliases: { '@': './src' },
  monorepo: { isMonorepo: false },
  simplifyConfig: true,
};

const packageModeAsset = {
  id: 'ui/button',
  version: '1.0.0',
  category: 'ui',
  name: 'Button',
  publisher: 'simplify-dev',
  schemaVersion: 1,
  description: 'A button component',
  status: 'official' as const,
  license: 'MIT',
  targets: [{ language: 'typescript', framework: 'react' }],
  implementations: [
    {
      id: 'ui/button',
      target: { language: 'typescript', framework: 'react' },
      mode: 'package' as const,
      entry: './dist/button.js',
    },
  ],
  installation: {
    modes: [
      {
        mode: 'package' as const,
        packageName: '@simplify-dev/ui-button',
        dependencies: {
          packages: [{ name: 'react', version: '^18.0.0', kind: 'peer' as const }],
        },
      },
    ],
  },
};

const sourceModeAsset = {
  id: 'blocks/chat',
  version: '1.0.0',
  category: 'blocks',
  name: 'Chat Block',
  publisher: 'simplify-dev',
  schemaVersion: 1,
  description: 'A chat block',
  status: 'official' as const,
  license: 'MIT',
  targets: [{ language: 'typescript', framework: 'react' }],
  implementations: [
    {
      id: 'blocks/chat',
      target: { language: 'typescript', framework: 'react' },
      mode: 'source' as const,
      entry: './chat.tsx',
    },
  ],
  installation: {
    modes: [
      {
        mode: 'source' as const,
        files: [{ source: 'chat.tsx', target: 'components/Chat.tsx' }],
        environment: [
          {
            name: 'CHAT_API_URL',
            description: 'The API URL for chat',
            required: true,
          },
        ],
        configuration: [
          {
            file: 'simplify.config.json',
            format: 'json' as const,
            operation: 'merge' as const,
            data: { chat: { enabled: true } },
          },
        ],
        setup: [{ description: 'Configure API key', required: true }],
      },
    ],
  },
};

const hybridModeAsset = {
  id: 'integrations/ai',
  version: '1.0.0',
  category: 'integrations',
  name: 'AI Integration',
  publisher: 'simplify-dev',
  schemaVersion: 1,
  description: 'AI integration',
  status: 'official' as const,
  license: 'MIT',
  targets: [{ language: 'typescript', framework: 'next' }],
  implementations: [
    {
      id: 'integrations/ai',
      target: { language: 'typescript', framework: 'next' },
      mode: 'hybrid' as const,
      entry: './adapter.ts',
    },
  ],
  installation: {
    modes: [
      {
        mode: 'hybrid' as const,
        packageName: '@simplify-dev/ai-integration',
        files: [{ source: 'adapter.ts', target: 'lib/ai-adapter.ts' }],
        dependencies: {
          packages: [{ name: 'ai', version: '^3.0.0', kind: 'runtime' as const }],
        },
      },
    ],
  },
};

const baseOptions: PlannerOptions = {
  assetId: 'ui/button',
  cwd: '/test/project',
};

describe('planInstallation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue(new Uint8Array());
  });

  describe('successful plan generation', () => {
    it('should generate a plan for a package-mode asset', async () => {
      mockGetAsset.mockResolvedValue(packageModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'ui/button', version: '1.0.0', category: 'ui' }],
        registryDependencies: [],
        packageDependencies: [{ name: 'react', version: '^18.0.0', kind: 'peer' }],
        installationModes: [{ assetId: 'ui/button', mode: 'package' }],
        fileMappings: [],
        environmentVariables: [],
        configurationChanges: [],
      });

      const plan = await planInstallation(baseOptions, baseProjectConfig, baseDetectionResult);

      expect(plan.assetId).toBe('ui/button');
      expect(plan.version).toBe('1.0.0');
      expect(plan.installationMode).toBe('package');
      expect(plan.dryRun).toBe(false);
      expect(plan.packageDependencies).toHaveLength(1);
      expect(plan.packageDependencies[0]).toEqual({
        name: 'react',
        version: '^18.0.0',
        kind: 'peer',
      });
      expect(plan.fileChanges).toHaveLength(0);
      expect(mockGetAsset).toHaveBeenCalledWith('ui/button', undefined);
      expect(mockResolve).toHaveBeenCalledWith(['ui/button'], baseProjectConfig);
    });

    it('should generate a plan for a source-mode asset', async () => {
      const options: PlannerOptions = {
        ...baseOptions,
        assetId: 'blocks/chat',
        mode: 'source',
      };
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [
          {
            source: 'chat.tsx',
            target: 'components/Chat.tsx',
            assetId: 'blocks/chat',
          },
        ],
        environmentVariables: [
          {
            name: 'CHAT_API_URL',
            description: 'The API URL for chat',
            required: true,
          },
        ],
        configurationChanges: [
          {
            file: 'simplify.config.json',
            format: 'json',
            operation: 'merge',
            data: { chat: { enabled: true } },
          },
        ],
      });
      mockGetAssetFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

      const plan = await planInstallation(options, baseProjectConfig, baseDetectionResult);

      expect(plan.assetId).toBe('blocks/chat');
      expect(plan.installationMode).toBe('source');
      expect(plan.fileChanges).toHaveLength(1);
      expect(plan.fileChanges[0]!).toMatchObject({
        source: 'chat.tsx',
        target: 'components/Chat.tsx',
        assetId: 'blocks/chat',
      });
      expect(plan.environmentVariables).toHaveLength(1);
      expect(plan.environmentVariables[0]!.name).toBe('CHAT_API_URL');
      expect(plan.setupSteps).toHaveLength(1);
      expect(plan.setupSteps[0]!.description).toBe('Configure API key');
    });

    it('should generate a plan for a hybrid-mode asset', async () => {
      const options: PlannerOptions = {
        ...baseOptions,
        assetId: 'integrations/ai',
        mode: 'hybrid',
      };
      mockGetAsset.mockResolvedValue(hybridModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'integrations/ai', version: '1.0.0', category: 'integrations' }],
        registryDependencies: [],
        packageDependencies: [{ name: 'ai', version: '^3.0.0', kind: 'runtime' }],
        installationModes: [{ assetId: 'integrations/ai', mode: 'hybrid' }],
        fileMappings: [
          {
            source: 'adapter.ts',
            target: 'lib/ai-adapter.ts',
            assetId: 'integrations/ai',
          },
        ],
        environmentVariables: [],
        configurationChanges: [],
      });
      mockGetAssetFile.mockResolvedValue(new Uint8Array([4, 5, 6]));

      const plan = await planInstallation(options, baseProjectConfig, baseDetectionResult);

      expect(plan.assetId).toBe('integrations/ai');
      expect(plan.installationMode).toBe('hybrid');
      expect(plan.packageDependencies).toHaveLength(1);
      expect(plan.fileChanges).toHaveLength(1);
    });
  });

  describe('dry-run mode', () => {
    it('should produce a plan with dryRun flag set to true', async () => {
      const options: PlannerOptions = { ...baseOptions, dryRun: true };
      mockGetAsset.mockResolvedValue(packageModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'ui/button', version: '1.0.0', category: 'ui' }],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'ui/button', mode: 'package' }],
        fileMappings: [],
        environmentVariables: [],
        configurationChanges: [],
      });

      const plan = await planInstallation(options, baseProjectConfig, baseDetectionResult);

      expect(plan.dryRun).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw ASSET_NOT_FOUND when asset is not found', async () => {
      mockGetAsset.mockResolvedValue(null);

      await expect(
        planInstallation(baseOptions, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({
        code: 'ASSET_NOT_FOUND',
        name: 'InstallationPlanError',
      });
    });

    it('should throw MISSING_DEPENDENCY when resolver reports missing asset', async () => {
      mockGetAsset.mockResolvedValue(packageModeAsset);
      const err = new Error('Registry asset "ui/nonexistent" was not found.') as Error & {
        code: string;
        details?: Record<string, unknown>;
      };
      err.code = 'MISSING_ASSET';
      err.details = { assetId: 'ui/nonexistent' };
      mockResolve.mockRejectedValue(err);

      await expect(
        planInstallation(baseOptions, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({ code: 'MISSING_DEPENDENCY' });
    });

    it('should throw CYCLE_DETECTED for circular dependencies', async () => {
      mockGetAsset.mockResolvedValue(packageModeAsset);
      const err = new Error('Circular dependency detected involving "ui/button".') as Error & {
        code: string;
        details?: Record<string, unknown>;
      };
      err.code = 'CYCLE_DETECTED';
      err.details = { assetId: 'ui/button' };
      mockResolve.mockRejectedValue(err);

      await expect(
        planInstallation(baseOptions, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({ code: 'CYCLE_DETECTED' });
    });

    it('should throw DUPLICATE_FILE_TARGET for duplicate targets', async () => {
      mockGetAsset.mockResolvedValue(packageModeAsset);
      const err = new Error('Duplicate file target "components/Button.tsx".') as Error & {
        code: string;
        details?: Record<string, unknown>;
      };
      err.code = 'DUPLICATE_FILE_TARGET';
      err.details = { target: 'components/Button.tsx', assetId: 'ui/button' };
      mockResolve.mockRejectedValue(err);

      await expect(
        planInstallation(baseOptions, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({ code: 'DUPLICATE_FILE_TARGET' });
    });

    it('should throw UNSUPPORTED_MODE for unsupported mode', async () => {
      const options: PlannerOptions = {
        ...baseOptions,
        assetId: 'blocks/chat',
        mode: 'package',
      };
      mockGetAsset.mockResolvedValue(sourceModeAsset);

      await expect(
        planInstallation(options, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_MODE' });
    });

    it('should throw UNSAFE_PATH for path traversal in targetPath option', async () => {
      const options: PlannerOptions = {
        ...baseOptions,
        targetPath: '../../../etc/passwd',
      };
      mockGetAsset.mockResolvedValue(packageModeAsset);

      await expect(
        planInstallation(options, baseProjectConfig, baseDetectionResult),
      ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
    });
  });

  describe('existing file conflict detection', () => {
    it('should mark new files as "new" when target does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [
          {
            source: 'chat.tsx',
            target: 'components/Chat.tsx',
            assetId: 'blocks/chat',
          },
        ],
        environmentVariables: [],
        configurationChanges: [],
      });
      mockGetAssetFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat', mode: 'source' },
        baseProjectConfig,
        baseDetectionResult,
      );

      expect(plan.fileChanges[0]!.status).toBe('new');
    });

    it('should mark files as "unchanged" when content matches registry', async () => {
      const content = new Uint8Array([1, 2, 3]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(content);
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [
          {
            source: 'chat.tsx',
            target: 'components/Chat.tsx',
            assetId: 'blocks/chat',
          },
        ],
        environmentVariables: [],
        configurationChanges: [],
      });
      mockGetAssetFile.mockResolvedValue(content);

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat', mode: 'source' },
        baseProjectConfig,
        baseDetectionResult,
      );

      expect(plan.fileChanges[0]!.status).toBe('unchanged');
    });

    it('should mark files as "modified" when content differs from registry', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(new Uint8Array([9, 9, 9]));
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [{ id: 'blocks/chat', version: '1.0.0', category: 'blocks' }],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [
          {
            source: 'chat.tsx',
            target: 'components/Chat.tsx',
            assetId: 'blocks/chat',
          },
        ],
        environmentVariables: [],
        configurationChanges: [],
      });
      mockGetAssetFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat', mode: 'source' },
        baseProjectConfig,
        baseDetectionResult,
      );

      expect(plan.fileChanges[0]!.status).toBe('modified');
    });

    it('should compare dependency files against the resolved dependency version', async () => {
      const content = new Uint8Array([7, 7, 7]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(content);
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [
          { id: 'blocks/chat', version: '1.0.0', category: 'blocks' },
          { id: 'ui/button', version: '2.3.4', category: 'ui' },
        ],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [
          {
            source: 'button.tsx',
            target: 'components/Button.tsx',
            assetId: 'ui/button',
          },
        ],
        environmentVariables: [],
        configurationChanges: [],
      });
      mockGetAssetFile.mockResolvedValue(content);

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat', mode: 'source' },
        baseProjectConfig,
        baseDetectionResult,
      );

      expect(mockGetAssetFile).toHaveBeenCalledWith('ui/button', '2.3.4', 'button.tsx');
      expect(plan.fileChanges[0]!.status).toBe('unchanged');
    });
  });

  describe('mode selection', () => {
    it('should use explicitly requested mode when supported', async () => {
      const options: PlannerOptions = {
        ...baseOptions,
        assetId: 'integrations/ai',
        mode: 'hybrid',
      };
      mockGetAsset.mockResolvedValue(hybridModeAsset);
      mockResolve.mockResolvedValue({
        assets: [],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'integrations/ai', mode: 'hybrid' }],
        fileMappings: [],
        environmentVariables: [],
        configurationChanges: [],
      });

      const plan = await planInstallation(options, baseProjectConfig, baseDetectionResult);
      expect(plan.installationMode).toBe('hybrid');
    });

    it('should fall back to config default mode when asset supports it', async () => {
      const configWithSourceDefault: ProjectConfiguration = {
        ...baseProjectConfig,
        installation: {
          ...baseProjectConfig.installation,
          defaultMode: 'source',
        },
      };
      mockGetAsset.mockResolvedValue(sourceModeAsset);
      mockResolve.mockResolvedValue({
        assets: [],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'source' }],
        fileMappings: [],
        environmentVariables: [],
        configurationChanges: [],
      });

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat' },
        configWithSourceDefault,
        baseDetectionResult,
      );
      expect(plan.installationMode).toBe('source');
    });

    it('should use first available mode when config default is not supported', async () => {
      const assetWithPackageOnly = {
        ...sourceModeAsset,
        installation: {
          modes: [{ mode: 'package' as const, packageName: '@simplify-dev/chat' }],
        },
      };
      mockGetAsset.mockResolvedValue(assetWithPackageOnly);
      mockResolve.mockResolvedValue({
        assets: [],
        registryDependencies: [],
        packageDependencies: [],
        installationModes: [{ assetId: 'blocks/chat', mode: 'package' }],
        fileMappings: [],
        environmentVariables: [],
        configurationChanges: [],
      });

      const plan = await planInstallation(
        { ...baseOptions, assetId: 'blocks/chat' },
        baseProjectConfig,
        baseDetectionResult,
      );
      expect(plan.installationMode).toBe('package');
    });
  });
});
