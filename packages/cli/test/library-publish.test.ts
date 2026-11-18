import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadGitHubAppConfig } from '@simplify-dev/github';
import { libraryPublishCommand } from '../src/commands/library-publish.js';
import { publishedVersionStore } from '../src/commands/library-publish.js';
import type { CommandContext } from '../src/cli.js';

const links = new Map<string, any>();
const mockCreateInstallationToken = vi.fn().mockResolvedValue({
  token: 'installation-token-123',
  expiresAt: '2026-01-02T00:00:00.000Z',
});
const mockFetch = vi.fn();

vi.mock('@simplify-dev/github', () => {
  const createGitHubAppClient = vi.fn((): any => ({
    createInstallationToken: mockCreateInstallationToken,
  }));
  const loadGitHubAppConfigMock = vi.fn((): any => ({
    appId: 1,
    privateKey: 'private-key',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookSecret: 'webhook-secret',
  }));
  class GitHubConnectionService {
    private readonly store: any;
    constructor(options: { appClient: any; repositoryStore: any }) {
      this.store = options.repositoryStore;
    }
    async getLibraryRepository(libraryId: string) {
      return this.store.findByLibraryId(libraryId);
    }
  }
  class InMemoryRepositoryLinkStore {
    async findByLibraryId(libraryId: string) {
      return [...links.values()].find((link) => link.libraryId === libraryId);
    }
    async save(link: any): Promise<void> {
      links.set(link.repositoryId, link);
    }
  }
  return {
    createGitHubAppClient,
    loadGitHubAppConfig: loadGitHubAppConfigMock,
    GitHubConnectionService,
    InMemoryRepositoryLinkStore,
  };
});

vi.mock('@simplify-dev/tooling', () => ({
  buildLibrary: vi.fn(),
  validateLibrary: vi.fn(),
}));

vi.mock('@simplify-dev/registry', () => ({
  validatePublicationRecord: vi.fn(() => ({ valid: true, issues: [] })),
}));

import { buildLibrary, validateLibrary } from '@simplify-dev/tooling';
import { validatePublicationRecord } from '@simplify-dev/registry';

const mockBuildLibrary = buildLibrary as ReturnType<typeof vi.fn>;
const mockValidateLibrary = validateLibrary as ReturnType<typeof vi.fn>;
const mockValidatePublicationRecord = validatePublicationRecord as ReturnType<typeof vi.fn>;

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

function mockFetchResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Response;
}

let testDir: string;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

const repositoryLink = {
  repositoryId: 'repo-1',
  owner: 'octocat',
  name: 'hello-world',
  fullName: 'octocat/hello-world',
  url: 'https://github.com/octocat/hello-world',
  defaultBranch: 'main',
  visibility: 'public',
  libraryId: 'test-lib',
  linkedAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
};

const libraryManifest = {
  schemaVersion: 1,
  id: 'test-lib',
  name: 'Test Library',
  description: 'A test library.',
  version: '1.2.0',
  license: 'MIT',
  assets: ['simplify/assets/example.asset.json'],
  publishing: {
    include: ['simplify/**', 'README.md'],
    exclude: ['**/node_modules/**', '**/.env*'],
  },
};

const publicationRecord = {
  schemaVersion: 1,
  libraryId: 'test-lib',
  version: '1.2.0',
  source: {
    repositoryId: 'repo-1',
    owner: 'octocat',
    name: 'hello-world',
    url: 'https://github.com/octocat/hello-world',
    commitSha: 'abc123def4567890abc123def4567890abc12345',
    tag: 'v1.2.0',
  },
  publishedAt: '2026-01-01T00:00:00.000Z',
  artifact: {
    url: 'https://registry.simplify.dev/libraries/test-lib/@1.2.0',
    integrity: 'sha256-abc123',
  },
  publisher: 'simplify-dev',
  immutable: true,
};

const buildResult = {
  artifacts: [],
  metadata: {
    schemaVersion: 1,
    libraryId: 'test-lib',
    version: '1.2.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceCommitSha: 'abc123def4567890abc123def4567890abc12345',
    assets: [],
    files: [],
    publicationRecord,
  },
  publicationRecord,
  deterministic: true,
};

async function writeManifest(dir: string, manifest: unknown): Promise<void> {
  await fs.mkdir(join(dir, 'simplify'), { recursive: true });
  await fs.writeFile(join(dir, 'simplify', 'library.json'), JSON.stringify(manifest), 'utf8');
}

beforeEach(async () => {
  links.clear();
  publishedVersionStore.clear();
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-publish-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mockCreateInstallationToken.mockReset();
  mockCreateInstallationToken.mockResolvedValue({
    token: 'installation-token-123',
    expiresAt: '2026-01-02T00:00:00.000Z',
  });
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(
    mockFetchResponse({
      object: { sha: 'abc123def4567890abc123def4567890abc12345', type: 'commit' },
    }),
  );
  vi.stubGlobal('fetch', mockFetch);
  mockBuildLibrary.mockReset();
  mockBuildLibrary.mockResolvedValue(buildResult);
  mockValidateLibrary.mockReset();
  mockValidateLibrary.mockResolvedValue({
    valid: true,
    library: libraryManifest,
    assets: [],
    issues: [],
  });
  mockValidatePublicationRecord.mockReset();
  mockValidatePublicationRecord.mockReturnValue({ valid: true, issues: [] });
  vi.mocked(loadGitHubAppConfig).mockReset();
  vi.mocked(loadGitHubAppConfig).mockReturnValue({
    appId: 1,
    privateKey: 'private-key',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookSecret: 'webhook-secret',
  });
  links.set('repo-1', { ...repositoryLink });
  await writeManifest(testDir, libraryManifest);
});

afterEach(async () => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  vi.unstubAllGlobals();
  await fs.rm(testDir, { recursive: true, force: true });
});

function baseOptions(): Record<string, string | boolean> {
  return { 'installation-id': '123', path: testDir };
}

describe('library-publish', () => {
  it('publishes a stable release from a matching tag', async () => {
    const context = makeContext({
      args: ['test-lib', 'v1.2.0'],
      options: { ...baseOptions() },
    });

    await libraryPublishCommand.handler(context);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/octocat/hello-world/git/ref/tags/v1.2.0',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'token installation-token-123' }),
      }),
    );
    expect(mockValidateLibrary).toHaveBeenCalledWith(testDir);
    expect(mockBuildLibrary).toHaveBeenCalledWith(testDir, {
      libraryRoot: testDir,
      version: '1.2.0',
      dryRun: false,
    });
    expect(mockValidatePublicationRecord).toHaveBeenCalledWith(publicationRecord);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Published library "test-lib" version 1.2.0 from commit abc123def4567890abc123def4567890abc12345',
      ),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://registry.simplify.dev/libraries/test-lib/@1.2.0'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Immutable: true'));

    const isPublished = await publishedVersionStore.has('test-lib', '1.2.0');
    expect(isPublished).toBe(true);
  });

  it('publishes using the --tag option instead of a positional argument', async () => {
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions(), tag: 'v1.2.0' },
    });

    await libraryPublishCommand.handler(context);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/git/ref/tags/v1.2.0'),
      expect.anything(),
    );
    expect(mockBuildLibrary).toHaveBeenCalledWith(testDir, {
      libraryRoot: testDir,
      version: '1.2.0',
      dryRun: false,
    });
  });

  it('rejects a tag whose version does not match the manifest', async () => {
    const context = makeContext({
      args: ['test-lib', 'v2.0.0'],
      options: { ...baseOptions() },
    });

    let error: unknown;
    try {
      await libraryPublishCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'TAG_VERSION_MISMATCH' });
    expect((error as Error).message).toContain('v1.2.0');
    expect(mockBuildLibrary).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid tag', async () => {
    const context = makeContext({
      args: ['test-lib', 'not-a-version'],
      options: { ...baseOptions() },
    });

    let error: unknown;
    try {
      await libraryPublishCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'INVALID_TAG' });
    expect(mockBuildLibrary).not.toHaveBeenCalled();
  });

  it('prevents duplicate publishing of the same version', async () => {
    await libraryPublishCommand.handler(
      makeContext({
        args: ['test-lib', 'v1.2.0'],
        options: { ...baseOptions() },
      }),
    );

    let error: unknown;
    try {
      await libraryPublishCommand.handler(
        makeContext({
          args: ['test-lib', 'v1.2.0'],
          options: { ...baseOptions() },
        }),
      );
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'ALREADY_PUBLISHED' });
    expect((error as Error).message).toContain('immutable');
    expect((error as Error).message).toContain('new version');
    expect(mockBuildLibrary).toHaveBeenCalledTimes(1);
  });

  it('errors when the library is not connected to a repository', async () => {
    links.clear();
    const context = makeContext({
      args: ['unknown-lib', 'v1.2.0'],
      options: { ...baseOptions() },
    });

    let error: unknown;
    try {
      await libraryPublishCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'NOT_CONNECTED' });
    expect(mockBuildLibrary).not.toHaveBeenCalled();
  });

  it('reports a build failure', async () => {
    mockBuildLibrary.mockRejectedValue(new Error('missing manifest'));
    const context = makeContext({
      args: ['test-lib', 'v1.2.0'],
      options: { ...baseOptions() },
    });

    let error: unknown;
    try {
      await libraryPublishCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'BUILD_FAILED' });
    expect((error as Error).message).toContain('missing manifest');
  });

  it('reports a validation failure before building', async () => {
    mockValidateLibrary.mockResolvedValue({
      valid: false,
      library: undefined,
      assets: [],
      issues: [{ path: '/version', message: 'not semver', keyword: 'invalidLibraryVersion' }],
    });
    const context = makeContext({
      args: ['test-lib', 'v1.2.0'],
      options: { ...baseOptions() },
    });

    let error: unknown;
    try {
      await libraryPublishCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(mockBuildLibrary).not.toHaveBeenCalled();
  });

  it('supports dry-run mode without recording a publication', async () => {
    const context = makeContext({
      args: ['test-lib', 'v1.2.0'],
      options: { ...baseOptions() },
      dryRun: true,
    });

    await libraryPublishCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry-run complete.'));
    const isPublished = await publishedVersionStore.has('test-lib', '1.2.0');
    expect(isPublished).toBe(false);
  });
});
