import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { libraryWorkflowCommand } from '../src/commands/library-workflow.js';
import {
  DEFAULT_SIMPLIFY_WORKFLOW_PATH,
  SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE,
  SIMPLIFY_LIBRARY_WORKFLOW_VERSION,
} from '../src/workflows/simplify-library.js';
import type { CommandContext } from '../src/cli.js';

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    args: [],
    options: {},
    dryRun: false,
    verbose: false,
    debug: false,
    json: false,
    interactive: false,
    ...overrides,
  } as CommandContext;
}

let testDir: string;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-library-workflow-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(async () => {
  logSpy.mockRestore();
  await fs.rm(testDir, { recursive: true, force: true });
});

describe('library-workflow', () => {
  it('generates the canonical workflow at the default path', async () => {
    await libraryWorkflowCommand.handler(makeContext({ options: { 'target-dir': testDir } }));

    const workflowPath = join(testDir, DEFAULT_SIMPLIFY_WORKFLOW_PATH);
    const content = await fs.readFile(workflowPath, 'utf8');

    expect(content).toBe(SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE);
    expect(content).toContain(
      `simplify.dev library workflow (v${SIMPLIFY_LIBRARY_WORKFLOW_VERSION})`,
    );
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('fetch-depth: 0');
    expect(content).toContain('node-version: 20');
    expect(content).toContain('version: 9');
    expect(content).toContain('workflow_dispatch:');
    expect(content).toContain('pull_request:');
    expect(content).toContain('permissions:\n  contents: read');
    expect(content).toContain('simplify asset validate --library');
    expect(content).toContain('simplify library-build');
    expect(content).toContain('simplify library-publish');
    expect(content).toContain('SIMPLIFY_PUBLISH_TOKEN');
    expect(content).toContain("github.event_name != 'pull_request'");
  });

  it('supports a custom output path', async () => {
    await libraryWorkflowCommand.handler(
      makeContext({ options: { 'target-dir': testDir, output: 'ci/custom.yml' } }),
    );

    const content = await fs.readFile(join(testDir, 'ci/custom.yml'), 'utf8');
    expect(content).toBe(SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE);
  });

  it('does not overwrite an existing workflow without --force', async () => {
    const workflowPath = join(testDir, DEFAULT_SIMPLIFY_WORKFLOW_PATH);
    await fs.mkdir(join(testDir, '.github/workflows'), { recursive: true });
    await fs.writeFile(workflowPath, 'existing\n', 'utf8');

    let error: unknown;
    try {
      await libraryWorkflowCommand.handler(makeContext({ options: { 'target-dir': testDir } }));
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'FILE_EXISTS' });
    await expect(fs.readFile(workflowPath, 'utf8')).resolves.toBe('existing\n');
  });

  it('overwrites an existing workflow with --force', async () => {
    const workflowPath = join(testDir, DEFAULT_SIMPLIFY_WORKFLOW_PATH);
    await fs.mkdir(join(testDir, '.github/workflows'), { recursive: true });
    await fs.writeFile(workflowPath, 'existing\n', 'utf8');

    await libraryWorkflowCommand.handler(
      makeContext({ options: { 'target-dir': testDir, force: true } }),
    );

    await expect(fs.readFile(workflowPath, 'utf8')).resolves.toBe(
      SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE,
    );
  });

  it('writes nothing in dry-run mode', async () => {
    await libraryWorkflowCommand.handler(
      makeContext({ options: { 'target-dir': testDir }, dryRun: true }),
    );

    await expect(fs.access(join(testDir, DEFAULT_SIMPLIFY_WORKFLOW_PATH))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
  });

  it('rejects unexpected arguments', async () => {
    let error: unknown;
    try {
      await libraryWorkflowCommand.handler(
        makeContext({ args: ['extra'], options: { 'target-dir': testDir } }),
      );
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
