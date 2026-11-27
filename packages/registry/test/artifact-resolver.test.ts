import { resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  RegistryArtifactResolver,
  RegistryArtifactResolverError,
  SOURCE_V1_LAYOUT,
  type RegistryArtifactResolverErrorCode,
} from '../src/index.js';

const registryRoot = '/mock/registry';

function expectResolverError(
  run: () => unknown,
  code: RegistryArtifactResolverErrorCode,
): RegistryArtifactResolverError {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }

  if (!(caught instanceof RegistryArtifactResolverError)) {
    throw new Error(`Expected RegistryArtifactResolverError with code "${code}".`);
  }
  expect(caught.code).toBe(code);
  return caught;
}

describe('RegistryArtifactResolver', () => {
  const resolver = new RegistryArtifactResolver({ registryRoot });

  it('constructs only source-v1 paths without duplicating the asset category', () => {
    const paths = [
      resolver.indexPath(),
      resolver.assetManifestPath('ui/button', '1.0.0'),
      resolver.assetFilePath('ui/button', '1.0.0', 'src/button.tsx'),
      resolver.libraryManifestPath('agent-chat', '1.0.0'),
    ];

    expect(paths).toEqual([
      resolve(registryRoot, 'index.json'),
      resolve(registryRoot, 'ui/button/@1.0.0/asset.json'),
      resolve(registryRoot, 'ui/button/@1.0.0/src/button.tsx'),
      resolve(registryRoot, 'libraries/agent-chat/@1.0.0/manifest.json'),
    ]);
    for (const path of paths) {
      expect(path).not.toContain(`${sep}assets${sep}`);
      expect(path.startsWith(`${registryRoot}${sep}`)).toBe(true);
    }
  });

  it('rejects an unsupported layout discriminator with an actionable error', () => {
    const error = expectResolverError(
      () => new RegistryArtifactResolver({ registryRoot, layout: 'published-v1' }),
      'UNSUPPORTED_ARTIFACT_LAYOUT',
    );

    expect(error.message).toContain(`Only "${SOURCE_V1_LAYOUT}" is defined`);
    expect(error.details).toMatchObject({
      field: 'layout',
      value: 'published-v1',
      supportedLayout: SOURCE_V1_LAYOUT,
    });
  });

  it('validates an asset ID without constructing a path', () => {
    expect(() => resolver.validateAssetId('ui/button')).not.toThrow();
    expectResolverError(() => resolver.validateAssetId('Button'), 'INVALID_ASSET_ID');
  });

  it.each(['Button', 'ui/ui/button', '../ui/button', 'ui/../button', 'ui/', ''])(
    'rejects invalid asset ID %j',
    (assetId) => {
      expectResolverError(() => resolver.assetManifestPath(assetId, '1.0.0'), 'INVALID_ASSET_ID');
    },
  );

  it.each(['latest', '1.0.0/../../escape', '1.0.0 ', 'v1.0.0'])(
    'rejects invalid version %j',
    (version) => {
      expectResolverError(
        () => resolver.assetManifestPath('ui/button', version),
        'INVALID_VERSION',
      );
    },
  );

  it.each([
    '',
    '/src/button.tsx',
    'C:\\src\\button.tsx',
    'src\\button.tsx',
    '../outside/file.tsx',
    'src/../../outside/file.tsx',
    './src/button.tsx',
    'src//button.tsx',
  ])('rejects unsafe source path %j', (sourcePath) => {
    expectResolverError(
      () => resolver.assetFilePath('ui/button', '1.0.0', sourcePath),
      'INVALID_SOURCE_PATH',
    );
  });

  it.each(['../agent-chat', 'Agent Chat', 'agent_chat', ''])(
    'rejects invalid library ID %j',
    (libraryId) => {
      expectResolverError(
        () => resolver.libraryManifestPath(libraryId, '1.0.0'),
        'INVALID_LIBRARY_ID',
      );
    },
  );

  it('requires a non-empty registry root', () => {
    expectResolverError(
      () => new RegistryArtifactResolver({ registryRoot: '' }),
      'INVALID_REGISTRY_ROOT',
    );
  });

  it('normalizes the root and verifies containment after path construction', () => {
    const normalized = new RegistryArtifactResolver({
      registryRoot: resolve(registryRoot, 'nested', '..'),
    });

    expect(normalized.indexPath()).toBe(resolve(registryRoot, 'index.json'));
    expect(normalized.assetManifestPath('ui/button', '1.0.0')).toBe(
      resolve(registryRoot, 'ui/button/@1.0.0/asset.json'),
    );
  });
});
