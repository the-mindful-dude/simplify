import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateAssetManifest,
  validateRegistryIndex,
  type RegistryAssetSummary,
} from '../src/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const registryRoot = join(__dirname, '..', '..', '..', 'registry');

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function computeIntegrity(path: string): string {
  return `sha256-${createHash('sha256').update(readFileSync(path)).digest('base64')}`;
}

const assetPaths = [
  'ui/button/@1.0.0/asset.json',
  'blocks/agent-chat/@1.0.0/asset.json',
  'logic/chat-controller/@1.0.0/asset.json',
  'integrations/vercel-ai/@1.0.0/asset.json',
  'integrations/postgresql/@1.0.0/asset.json',
  'recipes/agent-chat-postgres/@1.0.0/asset.json',
] as const;

const expectedIntegrity: Record<string, string> = {
  'ui/button': 'sha256-lfy0SVjc4xOCRhvWHAA8M95iw4NYQSjvU1adDCivbZA=',
};

const requiredAssetFields = [
  'schemaVersion',
  'id',
  'category',
  'name',
  'description',
  'version',
  'publisher',
  'status',
  'license',
  'targets',
  'implementations',
] as const;

const requiredIndexAssetFields = [
  'id',
  'name',
  'category',
  'version',
  'status',
  'targets',
] as const;

describe('registry index', () => {
  it('loads and validates as a RegistryIndex document', () => {
    const index = readJsonFile(join(registryRoot, 'index.json'));
    const result = validateRegistryIndex(index);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.value).toBeDefined();
  });

  it('contains the official assets across all categories', () => {
    const index = readJsonFile(join(registryRoot, 'index.json'));
    const result = validateRegistryIndex(index);
    expect(result.valid).toBe(true);

    const assets = result.value!.assets as readonly RegistryAssetSummary[];
    expect(assets.length).toBeGreaterThanOrEqual(38);

    const categories = new Set(assets.map((a) => a.category));
    expect([...categories].sort()).toEqual(
      ['ui', 'blocks', 'logic', 'integrations', 'recipes', 'templates'].sort(),
    );

    const wellKnown = [
      'ui/button',
      'blocks/agent-chat',
      'logic/chat-controller',
      'integrations/vercel-ai',
      'integrations/postgresql',
      'recipes/agent-chat-postgres',
    ];
    const ids = new Set(assets.map((a) => a.id));
    for (const id of wellKnown) {
      expect(ids.has(id)).toBe(true);
    }

    expect(result.value!.libraries.length).toBeGreaterThanOrEqual(1);
  });

  it('has required fields on every index asset entry', () => {
    const index = readJsonFile(join(registryRoot, 'index.json'));
    const result = validateRegistryIndex(index);
    expect(result.valid).toBe(true);

    const assets = result.value!.assets as readonly RegistryAssetSummary[];
    for (const asset of assets) {
      for (const field of requiredIndexAssetFields) {
        expect(asset).toHaveProperty(field);
      }
      expect(asset.status).toBe('official');
    }
  });
});

describe('asset manifests', () => {
  for (const relative of assetPaths) {
    const id = relative.split('/')[0] + '/' + relative.split('/')[1];
    const path = join(registryRoot, relative);

    it(`validates the ${id} manifest`, () => {
      const manifest = readJsonFile(path);
      const result = validateAssetManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it(`has all required fields for ${id}`, () => {
      const manifest = readJsonFile(path) as Record<string, unknown>;
      for (const field of requiredAssetFields) {
        expect(manifest).toHaveProperty(field);
      }
    });

    it(`asset id category matches declared category for ${id}`, () => {
      const manifest = readJsonFile(path) as Record<string, string>;
      expect(manifest.id.split('/')[0]).toBe(manifest.category);
    });
  }

  it('exposes registry schema and entry types', () => {
    expect(validateRegistryIndex).toBeDefined();
    expect(validateAssetManifest).toBeDefined();
  });
});

describe('integrity hash verification', () => {
  for (const relative of assetPaths) {
    const id = relative.split('/')[0] + '/' + relative.split('/')[1];
    const path = join(registryRoot, relative);

    it(`computes a valid sha256 integrity hash for ${id}`, () => {
      const integrity = computeIntegrity(path);
      expect(/^sha256-[A-Za-z0-9+/]+={0,2}$/.test(integrity)).toBe(true);
    });
  }

  it('verifies a recorded integrity hash matches the file', () => {
    const path = join(registryRoot, 'ui/button/@1.0.0/asset.json');
    const integrity = computeIntegrity(path);
    expect(integrity).toBe(expectedIntegrity['ui/button']);
  });

  it('is deterministic across recomputation', () => {
    const path = join(registryRoot, 'logic/chat-controller/@1.0.0/asset.json');
    expect(computeIntegrity(path)).toBe(computeIntegrity(path));
  });
});
