import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RegistryClient } from '../src/index.js';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const registryRoot = join(testDir, '..', '..', '..', 'registry');

describe('RegistryClient against the checked-in registry', () => {
  it('resolves the real ui/button source-v1 manifest by ID and version', async () => {
    const client = new RegistryClient({ registryRoot });

    const asset = await client.getAsset('ui/button', '1.0.0');

    expect(asset).not.toBeNull();
    expect(asset).toMatchObject({
      id: 'ui/button',
      category: 'ui',
      version: '1.0.0',
    });
  });

  it('resolves the same manifest through the index version and through a file read', async () => {
    const client = new RegistryClient({ registryRoot });

    const fromIndex = await client.getAsset('ui/button');
    const fileBytes = await client.getAssetFile('ui/button', '1.0.0', 'asset.json');
    const onDisk = JSON.parse(
      readFileSync(join(registryRoot, 'ui/button/@1.0.0/asset.json'), 'utf8'),
    );

    expect(fromIndex?.id).toBe('ui/button');
    expect(JSON.parse(new TextDecoder().decode(fileBytes))).toEqual(onDisk);
  });
});
