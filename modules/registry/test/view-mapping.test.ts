import type { AssetManifest, RegistryIndex } from '@simplify-dev/registry';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SORT_LABELS,
  buildRegistrySnapshot,
  filterAndSortAssets,
  formatGeneratedAt,
  formatTargetLabel,
  isRegistrySnapshotEmpty,
  statusVariant,
  toAsyncState,
  toManifestView,
  toTargetView,
  type ManifestLoadResult,
  type RegistrySnapshot,
} from '../src/index.js';

const index: RegistryIndex = {
  schemaVersion: 1,
  generatedAt: '2026-01-02T03:04:05.000Z',
  assets: [
    {
      id: 'ui/button',
      category: 'ui',
      name: 'Button',
      description: 'A pressable control',
      version: '1.2.0',
      publisher: 'simplify',
      status: 'official',
      targets: [{ language: 'typescript', framework: 'react', runtime: 'browser' }],
    },
    {
      id: 'logic/math',
      category: 'logic',
      name: 'Math helpers',
      description: 'Small numeric helpers',
      version: '0.1.0',
      publisher: 'community',
      status: 'community',
      targets: [{ language: 'typescript' }],
    },
  ],
  libraries: [
    {
      id: 'core-kit',
      name: 'Core Kit',
      description: 'Core building blocks',
      version: '1.0.0',
      publisher: 'simplify',
      assets: ['ui/button'],
    },
  ],
};

const manifest: AssetManifest = {
  schemaVersion: 1,
  id: 'ui/button',
  category: 'ui',
  name: 'Button',
  description: 'A pressable control',
  version: '1.2.0',
  publisher: 'simplify',
  status: 'official',
  license: 'MIT',
  targets: [{ language: 'typescript', framework: 'react' }],
  implementations: [
    {
      id: 'button',
      mode: 'source',
      entry: 'src/button.ts',
      target: { language: 'typescript', framework: 'react' },
    },
  ],
  dependencies: {
    registry: [{ id: 'logic/math', version: '0.1.0' }],
    packages: [{ name: 'react', version: '^19.0.0', kind: 'peer' }],
  },
  installation: {
    modes: [
      { mode: 'source', files: [{ source: 'src/button.ts', target: 'components/button.ts' }] },
    ],
  },
  documentation: { readme: 'README.md', examples: ['example.tsx'] },
  preview: { entry: 'preview.tsx', scenarios: ['default'] },
};

const loads: readonly ManifestLoadResult[] = [
  {
    assetId: 'ui/button',
    view: toManifestView(manifest, 'registry/ui/button/@1.2.0/asset.json'),
    issue: null,
  },
  {
    assetId: 'logic/math',
    view: null,
    issue: {
      kind: 'absent',
      assetId: 'logic/math',
      detail: 'no versioned manifest at logic/math/@0.1.0/asset.json',
    },
  },
];

describe('buildRegistrySnapshot', () => {
  it('maps validated index and manifest data without I/O', () => {
    const snapshot = buildRegistrySnapshot(index, loads);

    expect(snapshot.generatedAt).toBe(index.generatedAt);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.assets.map((asset) => asset.id)).toEqual(['ui/button', 'logic/math']);
    expect(snapshot.assets[0]?.libraryIds).toEqual(['core-kit']);
    expect(snapshot.assets[0]?.tags).toEqual(['typescript', 'react', 'browser']);
    expect(snapshot.assets[0]?.targets[0]?.label).toBe('TypeScript · react · browser');
    expect(snapshot.assets[0]?.sourcePath).toBe('registry/index.json');
    expect(snapshot.libraries[0]?.assetIds).toEqual(['ui/button']);
    expect(snapshot.manifestCount).toBe(1);
    expect(snapshot.sourceFiles).toEqual([
      'registry/index.json',
      'registry/ui/button/@1.2.0/asset.json',
    ]);
    expect(snapshot.manifestIssues).toEqual([loads[1]?.issue]);
  });

  it('emits all six categories in a stable order', () => {
    const snapshot = buildRegistrySnapshot(index, loads);

    expect(snapshot.categoryCounts.map((count) => count.category)).toEqual(CATEGORY_ORDER);
    expect(snapshot.categoryCounts.map((count) => count.count)).toEqual([1, 0, 1, 0, 0, 0]);
    expect(snapshot.categoryCounts[0]?.label).toBe(CATEGORY_LABELS.ui);
  });

  it('defines an empty snapshot as one with no assets and no libraries', () => {
    expect(
      isRegistrySnapshotEmpty(buildRegistrySnapshot({ ...index, assets: [], libraries: [] }, [])),
    ).toBe(true);
    expect(isRegistrySnapshotEmpty(buildRegistrySnapshot(index, loads))).toBe(false);
  });
});

describe('toManifestView', () => {
  it('keeps only serializable, display-ready manifest data', () => {
    const view = toManifestView(manifest, 'registry/ui/button/@1.2.0/asset.json');

    expect(view.sourcePath).toBe('registry/ui/button/@1.2.0/asset.json');
    expect(view.license).toBe('MIT');
    expect(view.implementations[0]?.targetLabel).toBe('typescript · react');
    expect(view.registryDependencies[0]).toEqual({
      id: 'logic/math',
      version: '0.1.0',
      optional: false,
    });
    expect(view.packageDependencies[0]).toEqual({
      name: 'react',
      version: '^19.0.0',
      kind: 'peer',
    });
    expect(view.installation[0]?.files).toEqual([
      { source: 'src/button.ts', target: 'components/button.ts' },
    ]);
    expect(view.documentation).toEqual({ readme: 'README.md', examples: ['example.tsx'] });
    expect(view.previewScenarios).toEqual(['default']);
  });
});

describe('view helpers', () => {
  const snapshot: RegistrySnapshot = buildRegistrySnapshot(index, loads);

  it('filters by category, library and ANDed search terms', () => {
    expect(
      filterAndSortAssets(snapshot.assets, {
        query: 'react button',
        category: 'ui',
        libraryId: 'core-kit',
        sort: 'name',
      }).map((asset) => asset.id),
    ).toEqual(['ui/button']);

    expect(
      filterAndSortAssets(snapshot.assets, {
        query: '',
        category: 'all',
        libraryId: 'all',
        sort: 'version',
      }).map((asset) => asset.id),
    ).toEqual(['ui/button', 'logic/math']);
  });

  it('maps statuses, targets and timestamps deterministically', () => {
    expect(statusVariant('official')).toBe('success');
    expect(statusVariant('verified')).toBe('success');
    expect(statusVariant('deprecated')).toBe('warning');
    expect(statusVariant('compromised')).toBe('danger');
    expect(statusVariant('community')).toBe('neutral');
    expect(formatTargetLabel({ language: 'typescript', framework: 'react' })).toBe(
      'TypeScript · react',
    );
    expect(toTargetView({ language: 'typescript', platform: 'web' })).toEqual({
      language: 'typescript',
      label: 'TypeScript · web',
    });
    expect(SORT_LABELS.version).toBe('Version');
    expect(formatGeneratedAt(index.generatedAt)).toBe('Jan 02, 2026');
    expect(formatGeneratedAt('not-a-date')).toBe('not-a-date');
  });
});

describe('toAsyncState', () => {
  it('maps loading, error, empty and success states', () => {
    expect(toAsyncState({ isPending: true, isError: false, error: null, data: undefined })).toEqual(
      {
        status: 'loading',
      },
    );

    const empty = buildRegistrySnapshot({ ...index, assets: [], libraries: [] }, []);
    expect(
      toAsyncState(
        { isPending: false, isError: false, error: null, data: empty },
        isRegistrySnapshotEmpty,
      ),
    ).toEqual({ status: 'empty' });

    const success = buildRegistrySnapshot(index, loads);
    const successState = toAsyncState({
      isPending: false,
      isError: false,
      error: null,
      data: success,
    });
    expect(successState.status).toBe('success');
    if (successState.status === 'success') {
      expect(successState.data).toBe(success);
    }
  });
});
