import { describe, expect, it } from 'vitest';

import * as blocks from '../packages/blocks/src/index.js';
import * as cli from '../packages/cli/src/index.js';
import * as github from '../packages/github/src/index.js';
import * as interaction from '../packages/interaction/src/index.js';
import * as registry from '../packages/registry/src/index.js';
import * as tokens from '../packages/tokens/src/index.js';
import * as tooling from '../packages/tooling/src/index.js';
import * as ui from '../packages/ui/src/index.js';

const publicEntries = {
  blocks,
  cli,
  github,
  interaction,
  registry,
  tokens,
  tooling,
  ui,
} as const;

describe('workspace public entry points', () => {
  it.each(Object.entries(publicEntries))(
    '%s exposes an importable public entry',
    (_name, entry) => {
      expect(entry).toBeTypeOf('object');
    },
  );
});
