import { describe, expect, it } from 'vitest';

import {
  DependencyResolver,
  ResolutionError,
  type AssetManifestLoader,
  type Conflict,
  type DependencyGraph,
  type ResolutionResult,
} from '../src/resolver/index.js';
import type { AssetManifest, ProjectConfiguration } from '@simplify-dev/schemas';

const projectConfiguration: ProjectConfiguration = {
  schemaVersion: 1,
  packageManager: 'pnpm',
  installation: {
    defaultMode: 'source',
    paths: {
      ui: 'src/components/ui',
      blocks: 'src/components/blocks',
      logic: 'src/lib',
      integrations: 'src/integrations',
      hooks: 'src/hooks',
      styles: 'src/styles',
    },
  },
};

function createAssetManifest(overrides: Partial<AssetManifest>): AssetManifest {
  const base: AssetManifest = {
    schemaVersion: 1,
    id: 'ui/button',
    category: 'ui',
    name: 'Button',
    description: 'An accessible button primitive.',
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
    installation: {
      modes: [
        {
          mode: 'source',
          files: [{ source: 'src/button.tsx', target: 'src/components/ui/button.tsx' }],
        },
      ],
    },
  };
  return { ...base, ...overrides } as AssetManifest;
}

function createLoader(assets: Record<string, AssetManifest>): AssetManifestLoader {
  return async (id: string): Promise<AssetManifest | undefined> => assets[id] ?? undefined;
}

describe('DependencyResolver', () => {
  describe('resolve', () => {
    it('resolves a single asset without dependencies', async () => {
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
      });
      const resolver = new DependencyResolver(createLoader({ 'ui/button': button }));

      const result = await resolver.resolve(['ui/button'], projectConfiguration);

      expect(result.assets).toEqual([{ id: 'ui/button', version: '1.0.0', category: 'ui' }]);
      expect(result.registryDependencies).toEqual([]);
      expect(result.packageDependencies).toEqual([]);
      expect(result.installationModes).toEqual([{ assetId: 'ui/button', mode: 'source' }]);
      expect(result.fileMappings).toEqual([
        {
          source: 'src/button.tsx',
          target: 'src/components/ui/button.tsx',
          assetId: 'ui/button',
        },
      ]);
      expect(result.environmentVariables).toEqual([]);
      expect(result.configurationChanges).toEqual([]);
    });

    it('resolves nested dependencies (A depends on B depends on C)', async () => {
      const utils = createAssetManifest({
        id: 'logic/utils',
        category: 'logic',
        version: '1.0.0',
        installation: {
          modes: [
            { mode: 'source', files: [{ source: 'src/utils.tsx', target: 'src/lib/utils.tsx' }] },
          ],
        },
      });
      const card = createAssetManifest({
        id: 'blocks/card',
        category: 'blocks',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'logic/utils', version: '^1.0.0' }],
        },
        installation: {
          modes: [
            {
              mode: 'source',
              files: [{ source: 'src/card.tsx', target: 'src/components/blocks/card.tsx' }],
            },
          ],
        },
      });
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'blocks/card', version: '^1.0.0' }],
        },
      });

      const resolver = new DependencyResolver(
        createLoader({ 'logic/utils': utils, 'blocks/card': card, 'ui/button': button }),
      );

      const result = await resolver.resolve(['ui/button'], projectConfiguration);

      expect(result.assets.map((asset) => `${asset.id}@${asset.version}`).sort()).toEqual([
        'blocks/card@1.0.0',
        'logic/utils@1.0.0',
        'ui/button@1.0.0',
      ]);
      expect(result.registryDependencies.map((dep) => `${dep.id}@${dep.version}`).sort()).toEqual([
        'blocks/card@^1.0.0',
        'logic/utils@^1.0.0',
      ]);
    });

    it('includes package dependencies', async () => {
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        dependencies: {
          packages: [{ name: 'radix-ui', version: '^1.0.0', kind: 'runtime' }],
        },
      });
      const resolver = new DependencyResolver(createLoader({ 'ui/button': button }));

      const result = await resolver.resolve(['ui/button'], projectConfiguration);

      expect(result.packageDependencies).toEqual([
        { name: 'radix-ui', version: '^1.0.0', kind: 'runtime' },
      ]);
    });

    it('collects environment variables and configuration changes', async () => {
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        installation: {
          modes: [
            {
              mode: 'source',
              environment: [
                {
                  name: 'BUTTON_API_KEY',
                  description: 'API key for the button service.',
                  required: true,
                  secret: true,
                },
              ],
              configuration: [
                {
                  file: 'simplify.config.json',
                  format: 'json',
                  operation: 'merge',
                  data: { button: { enabled: true } },
                },
              ],
            },
          ],
        },
      });
      const resolver = new DependencyResolver(createLoader({ 'ui/button': button }));

      const result = await resolver.resolve(['ui/button'], projectConfiguration);

      expect(result.environmentVariables).toHaveLength(1);
      expect(result.environmentVariables[0]?.name).toBe('BUTTON_API_KEY');
      expect(result.configurationChanges).toHaveLength(1);
      expect(result.configurationChanges[0]?.file).toBe('simplify.config.json');
    });

    it('is deterministic for the same input', async () => {
      const utils = createAssetManifest({
        id: 'logic/utils',
        category: 'logic',
        version: '1.0.0',
        installation: {
          modes: [
            { mode: 'source', files: [{ source: 'src/utils.tsx', target: 'src/lib/utils.tsx' }] },
          ],
        },
      });
      const card = createAssetManifest({
        id: 'blocks/card',
        category: 'blocks',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'logic/utils', version: '^1.0.0' }],
        },
        installation: {
          modes: [
            {
              mode: 'source',
              files: [{ source: 'src/card.tsx', target: 'src/components/blocks/card.tsx' }],
            },
          ],
        },
      });
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'blocks/card', version: '^1.0.0' }],
        },
      });
      const loader = createLoader({
        'logic/utils': utils,
        'blocks/card': card,
        'ui/button': button,
      });

      const resolver = new DependencyResolver(loader);
      const first = await resolver.resolve(['ui/button'], projectConfiguration);
      const second = await resolver.resolve(['ui/button'], projectConfiguration);

      expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
    });
  });

  describe('errors', () => {
    it('rejects a missing registry dependency', async () => {
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'logic/missing', version: '^1.0.0' }],
        },
      });
      const resolver = new DependencyResolver(createLoader({ 'ui/button': button }));

      await expect(resolver.resolve(['ui/button'], projectConfiguration)).rejects.toBeInstanceOf(
        ResolutionError,
      );
    });

    it('rejects duplicate file targets across assets', async () => {
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        installation: {
          modes: [
            {
              mode: 'source',
              files: [{ source: 'src/a.tsx', target: 'src/shared.tsx' }],
            },
          ],
        },
      });
      const card = createAssetManifest({
        id: 'blocks/card',
        category: 'blocks',
        version: '1.0.0',
        installation: {
          modes: [
            {
              mode: 'source',
              files: [{ source: 'src/b.tsx', target: 'src/shared.tsx' }],
            },
          ],
        },
      });
      const resolver = new DependencyResolver(
        createLoader({ 'ui/button': button, 'blocks/card': card }),
      );

      await expect(
        resolver.resolve(['ui/button', 'blocks/card'], projectConfiguration),
      ).rejects.toBeInstanceOf(ResolutionError);
    });
  });

  describe('resolveAssetGraph', () => {
    it('builds the full dependency graph for a single asset', async () => {
      const utils = createAssetManifest({
        id: 'logic/utils',
        category: 'logic',
        version: '1.0.0',
      });
      const card = createAssetManifest({
        id: 'blocks/card',
        category: 'blocks',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'logic/utils', version: '^1.0.0' }],
        },
      });
      const button = createAssetManifest({
        id: 'ui/button',
        category: 'ui',
        version: '1.0.0',
        dependencies: {
          registry: [{ id: 'blocks/card', version: '^1.0.0' }],
        },
      });
      const resolver = new DependencyResolver(
        createLoader({ 'logic/utils': utils, 'blocks/card': card, 'ui/button': button }),
      );

      const graph = await resolver.resolveAssetGraph('ui/button', '1.0.0');

      expect(graph.nodes.map((node) => node.id).sort()).toEqual([
        'blocks/card',
        'logic/utils',
        'ui/button',
      ]);
      expect(graph.edges).toContainEqual({
        from: 'ui/button',
        to: 'blocks/card',
        versionConstraint: '^1.0.0',
      });
      expect(graph.edges).toContainEqual({
        from: 'blocks/card',
        to: 'logic/utils',
        versionConstraint: '^1.0.0',
      });
    });
  });

  describe('detectCycles', () => {
    it('returns true for a circular dependency A -> B -> A', () => {
      const graph: DependencyGraph = {
        nodes: [
          { id: 'ui/button', version: '1.0.0' },
          { id: 'blocks/card', version: '1.0.0' },
        ],
        edges: [
          {
            from: 'ui/button',
            to: 'blocks/card',
            versionConstraint: '^1.0.0',
          },
          {
            from: 'blocks/card',
            to: 'ui/button',
            versionConstraint: '^1.0.0',
          },
        ],
      };
      const resolver = new DependencyResolver(async () => undefined);

      expect(resolver.detectCycles(graph)).toBe(true);
    });

    it('returns false for an acyclic graph', () => {
      const graph: DependencyGraph = {
        nodes: [
          { id: 'logic/utils', version: '1.0.0' },
          { id: 'blocks/card', version: '1.0.0' },
          { id: 'ui/button', version: '1.0.0' },
        ],
        edges: [
          { from: 'ui/button', to: 'blocks/card', versionConstraint: '^1.0.0' },
          { from: 'blocks/card', to: 'logic/utils', versionConstraint: '^1.0.0' },
        ],
      };
      const resolver = new DependencyResolver(async () => undefined);

      expect(resolver.detectCycles(graph)).toBe(false);
    });
  });

  describe('detectConflicts', () => {
    it('detects incompatible version constraints for the same dependency', () => {
      const graph: DependencyGraph = {
        nodes: [{ id: 'logic/utils', version: '1.0.0' }],
        edges: [
          {
            from: 'ui/button',
            to: 'logic/utils',
            versionConstraint: '^1.0.0',
          },
          {
            from: 'blocks/card',
            to: 'logic/utils',
            versionConstraint: '^2.0.0',
          },
        ],
      };
      const resolver = new DependencyResolver(async () => undefined);

      const conflicts = resolver.detectConflicts(graph);

      expect(conflicts.some((conflict) => conflict.type === 'version')).toBe(true);
      expect(
        conflicts.some(
          (conflict) =>
            conflict.type === 'version' && conflict.details.dependencyId === 'logic/utils',
        ),
      ).toBe(true);
    });

    it('detects a resolved version that violates a constraint', () => {
      const graph: DependencyGraph = {
        nodes: [{ id: 'logic/utils', version: '1.0.0' }],
        edges: [
          {
            from: 'ui/button',
            to: 'logic/utils',
            versionConstraint: '^2.0.0',
          },
        ],
      };
      const resolver = new DependencyResolver(async () => undefined);

      const conflicts = resolver.detectConflicts(graph);

      expect(conflicts.some((conflict) => conflict.type === 'version')).toBe(true);
    });

    it('returns no conflicts for compatible constraints', () => {
      const graph: DependencyGraph = {
        nodes: [{ id: 'logic/utils', version: '1.5.0' }],
        edges: [
          {
            from: 'ui/button',
            to: 'logic/utils',
            versionConstraint: '^1.0.0',
          },
          {
            from: 'blocks/card',
            to: 'logic/utils',
            versionConstraint: '^1.5.0',
          },
        ],
      };
      const resolver = new DependencyResolver(async () => undefined);

      const conflicts = resolver.detectConflicts(graph);

      expect(conflicts).toEqual([]);
    });
  });

  describe('Conflict type', () => {
    it('has a message and structured details', () => {
      const conflict: Conflict = {
        type: 'version',
        message: 'Incompatible versions for "logic/utils".',
        details: { dependencyId: 'logic/utils', left: '^1.0.0', right: '^2.0.0' },
      };

      expect(conflict.type).toBe('version');
      expect(conflict.message).toBe('Incompatible versions for "logic/utils".');
      expect(conflict.details.dependencyId).toBe('logic/utils');
    });
  });
});
