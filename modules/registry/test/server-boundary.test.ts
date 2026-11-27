import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const moduleRoot = process.cwd();

function sourceFiles(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      return sourceFiles(join(directory, entry.name), relative);
    }
    return entry.name.endsWith('.ts') ? [relative] : [];
  });
}

function readSource(relativePath: string): string {
  return readFileSync(join(moduleRoot, relativePath), 'utf8');
}

describe('server-only boundary', () => {
  it('keeps filesystem access and path construction out of the client-safe root', () => {
    const clientSources = sourceFiles(join(moduleRoot, 'src')).filter(
      (file) => !file.startsWith('server/'),
    );

    expect(clientSources).toContain('index.ts');
    for (const file of clientSources) {
      const source = readSource(join('src', file));
      expect(source, file).not.toMatch(/node:fs|node:path|readFile\(|existsSync\(/);
      expect(source, file).not.toContain("import 'server-only'");
    }
  });

  it('guards the deliberate server subpath and delegates to the registry package', () => {
    const serverEntry = readSource('src/server/index.ts');
    expect(serverEntry).toContain("import 'server-only';");
    expect(serverEntry).toContain('getRegistrySnapshot');
    expect(serverEntry).toContain('OnDiskRegistryRepository');

    const repository = readSource('src/server/repository.ts');
    for (const delegated of [
      'RegistryClient',
      'RegistryArtifactResolver',
      'validateAssetManifest',
      'validateRegistryIndex',
    ]) {
      expect(repository).toContain(delegated);
    }
    expect(repository).not.toContain('readFile(');
    expect(repository).not.toMatch(/join\([^)]*['"]assets['"]/);

    const manifest = readFileSync(join(moduleRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(manifest) as { exports: Record<string, { import?: string }> };
    expect(pkg.exports['./server']?.import).toBe('./dist/server/index.js');
  });

  it('leaves no filesystem or path logic in the web compatibility shims', () => {
    const webLib = join(moduleRoot, '..', '..', 'apps', 'web', 'lib');
    const shims: Readonly<Record<string, string>> = {
      'registry-data.ts': '@simplify-dev/module-registry/server',
      'catalog.ts': '@simplify-dev/module-registry',
      'types.ts': '@simplify-dev/module-registry',
    };

    for (const [file, expectedImport] of Object.entries(shims)) {
      const source = readFileSync(join(webLib, file), 'utf8');
      expect(source, file).toContain(expectedImport);
      expect(source, file).not.toMatch(/node:fs|node:path|readFile\(|existsSync\(/);
    }
  });
});
