import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { libraryConnectCommand } from '../src/commands/library-connect.js';
import { libraryDisconnectCommand } from '../src/commands/library-disconnect.js';
import { libraryStatusCommand } from '../src/commands/library-status.js';
import { publishingAttemptStore, resetPublishingState } from '../src/publishing.js';
import type { CommandContext } from '../src/cli.js';

const links = new Map<string, any>();

const mockGetRepository = vi.fn();
const mockListInstallationRepositories = vi.fn();

vi.mock('@simplify-dev/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplify-dev/github')>();
  const createGitHubAppClient = vi.fn((): any => ({
    getRepository: mockGetRepository,
    listInstallationRepositories: mockListInstallationRepositories,
    createInstallationToken: vi.fn(),
    getAuthenticatedUser: vi.fn(),
  }));
  const loadGitHubAppConfig = vi.fn((): any => ({
    appId: 1,
    privateKey: 'private-key',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookSecret: 'webhook-secret',
  }));

  class GitHubConnectionService {
    private readonly appClient: any;
    private readonly store: any;

    constructor(options: { appClient: any; repositoryStore: any }) {
      this.appClient = options.appClient;
      this.store = options.repositoryStore;
    }

    async linkRepository(input: { repository: any; libraryId: string }): Promise<any> {
      const byRepository = await this.store.findByRepositoryId(input.repository.repositoryId);
      if (byRepository && byRepository.libraryId !== input.libraryId) {
        const error = new Error(
          `Repository ${input.repository.fullName} is already linked to library ${byRepository.libraryId}.`,
        ) as any;
        error.code = 'repository_already_linked';
        throw error;
      }
      const byLibrary = await this.store.findByLibraryId(input.libraryId);
      if (byLibrary && byLibrary.repositoryId !== input.repository.repositoryId) {
        const error = new Error(
          `Library ${input.libraryId} is already linked to repository ${byLibrary.owner}/${byLibrary.name}.`,
        ) as any;
        error.code = 'library_already_linked';
        throw error;
      }
      const link = {
        ...input.repository,
        libraryId: input.libraryId,
        linkedAt: new Date().toISOString(),
        status: 'active',
      };
      await this.store.save(link);
      return link;
    }

    async disconnectRepository(repositoryId: string): Promise<void> {
      await this.store.delete(repositoryId);
    }

    async getLibraryRepository(libraryId: string): Promise<any | undefined> {
      return this.store.findByLibraryId(libraryId);
    }
  }

  class InMemoryRepositoryLinkStore {
    async findByRepositoryId(repositoryId: string) {
      return links.get(repositoryId);
    }
    async findByLibraryId(libraryId: string) {
      return [...links.values()].find((link) => link.libraryId === libraryId);
    }
    async save(link: any): Promise<void> {
      links.set(link.repositoryId, link);
    }
    async delete(repositoryId: string): Promise<void> {
      links.delete(repositoryId);
    }
    async list(): Promise<any[]> {
      return [...links.values()];
    }
  }

  class RepositoryMetadataService {
    async synchronize(): Promise<any> {
      throw Object.assign(new Error('Repository is not linked.'), { code: 'repository_not_found' });
    }
    async refresh(): Promise<any> {
      return this.synchronize();
    }
    async markUnavailable(): Promise<any> {
      return undefined;
    }
  }

  return {
    ...actual,
    createGitHubAppClient,
    loadGitHubAppConfig,
    GitHubConnectionService,
    InMemoryRepositoryLinkStore,
    RepositoryMetadataService,
  };
});

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
let errorSpy: ReturnType<typeof vi.spyOn>;

const repositorySummary = {
  repositoryId: 'repo-1',
  owner: 'octocat',
  name: 'hello-world',
  fullName: 'octocat/hello-world',
  url: 'https://github.com/octocat/hello-world',
  defaultBranch: 'main',
  visibility: 'public',
};

const libraryManifest = {
  schemaVersion: 1,
  id: 'test-lib',
  name: 'Test Library',
  description: 'A test library for simplify.dev.',
  version: '0.1.0',
  license: 'MIT',
  assets: ['simplify/assets/example.asset.json'],
  publishing: {
    include: ['simplify/**', 'README.md'],
    exclude: ['**/node_modules/**', '**/.env*'],
  },
};

async function writeManifest(dir: string, manifest: unknown): Promise<void> {
  await fs.mkdir(join(dir, 'simplify'), { recursive: true });
  await fs.writeFile(join(dir, 'simplify', 'library.json'), JSON.stringify(manifest), 'utf8');
}

beforeEach(async () => {
  links.clear();
  resetPublishingState();
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-connect-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mockGetRepository.mockReset();
  mockListInstallationRepositories.mockReset();
  mockGetRepository.mockResolvedValue(repositorySummary);
  mockListInstallationRepositories.mockResolvedValue([]);
});

afterEach(async () => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  await fs.rm(testDir, { recursive: true, force: true });
});

const baseOptions = {
  'installation-id': '123',
  'target-dir': '',
} as Record<string, string | boolean>;

describe('library-connect', () => {
  it('connects an existing repository with a valid library manifest', async () => {
    await writeManifest(testDir, libraryManifest);
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'target-dir': testDir },
    });

    await libraryConnectCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Connected octocat/hello-world to library "test-lib".'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://github.com/octocat/hello-world'),
    );
    const link = links.get('repo-1');
    expect(link).toBeDefined();
    expect(link.libraryId).toBe('test-lib');
    expect(link.status).toBe('active');
  });

  it('derives the library id from the repository name when no manifest exists', async () => {
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'target-dir': testDir },
    });

    await libraryConnectCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Connected octocat/hello-world to library "hello-world".'),
    );
    const link = links.get('repo-1');
    expect(link.libraryId).toBe('hello-world');
    await expect(fs.access(join(testDir, 'simplify', 'library.json'))).resolves.toBeUndefined();
  });

  it('errors when the repository is already linked to a different library', async () => {
    links.set('repo-1', {
      ...repositorySummary,
      libraryId: 'other-lib',
      linkedAt: new Date().toISOString(),
      status: 'active',
    });
    await writeManifest(testDir, { ...libraryManifest, id: 'new-lib' });
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'library-id': 'new-lib', 'target-dir': testDir },
    });

    let error: unknown;
    try {
      await libraryConnectCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'REPOSITORY_ALREADY_LINKED' });
    expect((error as Error).message).toContain('already linked');
  });

  it('errors when the library is already linked to a different repository', async () => {
    links.set('repo-a', {
      repositoryId: 'repo-a',
      owner: 'octocat',
      name: 'repo-a',
      fullName: 'octocat/repo-a',
      url: 'https://github.com/octocat/repo-a',
      defaultBranch: 'main',
      visibility: 'public',
      libraryId: 'lib-1',
      linkedAt: new Date().toISOString(),
      status: 'active',
    });
    await writeManifest(testDir, { ...libraryManifest, id: 'lib-1' });
    const context = makeContext({
      args: ['octocat/other-repo'],
      options: { ...baseOptions, 'library-id': 'lib-1', 'target-dir': testDir },
    });
    mockGetRepository.mockResolvedValue({
      ...repositorySummary,
      repositoryId: 'repo-b',
      name: 'other-repo',
      fullName: 'octocat/other-repo',
      url: 'https://github.com/octocat/other-repo',
    });

    let error: unknown;
    try {
      await libraryConnectCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'LIBRARY_ALREADY_LINKED' });
    expect((error as Error).message).toContain('already linked');
  });

  it('errors when the repository is not accessible', async () => {
    const notFound = Object.assign(new Error('Repository octocat/hello-world is not accessible.'), {
      code: 'repository_not_found',
    });
    mockGetRepository.mockRejectedValue(notFound);
    mockListInstallationRepositories.mockResolvedValue([]);
    await writeManifest(testDir, libraryManifest);
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'target-dir': testDir },
    });

    let error: unknown;
    try {
      await libraryConnectCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'REPOSITORY_NOT_ACCESSIBLE' });
    expect((error as Error).message).toContain('not accessible');
  });

  it('writes nothing in dry-run mode', async () => {
    await writeManifest(testDir, libraryManifest);
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'target-dir': testDir },
      dryRun: true,
    });

    await libraryConnectCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    expect(links.size).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry-run complete.'));
  });

  it('validates the library manifest and rejects invalid manifests', async () => {
    await fs.mkdir(join(testDir, 'simplify'), { recursive: true });
    await fs.writeFile(
      join(testDir, 'simplify', 'library.json'),
      JSON.stringify({ ...libraryManifest, id: 'bad id!' }),
      'utf8',
    );
    const context = makeContext({
      args: ['octocat/hello-world'],
      options: { ...baseOptions, 'target-dir': testDir },
    });

    let error: unknown;
    try {
      await libraryConnectCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'INVALID_MANIFEST' });
  });
});

describe('library-disconnect', () => {
  it('disconnects a linked repository by repository id', async () => {
    links.set('repo-1', {
      ...repositorySummary,
      libraryId: 'test-lib',
      linkedAt: new Date().toISOString(),
      status: 'active',
    });
    const context = makeContext({
      args: ['repo-1'],
      options: { ...baseOptions },
    });

    await libraryDisconnectCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Disconnected octocat/hello-world from library "test-lib".'),
    );
    expect(links.has('repo-1')).toBe(false);
  });

  it('disconnects a linked repository by library id', async () => {
    links.set('repo-1', {
      ...repositorySummary,
      libraryId: 'test-lib',
      linkedAt: new Date().toISOString(),
      status: 'active',
    });
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await libraryDisconnectCommand.handler(context);

    expect(links.has('repo-1')).toBe(false);
  });

  it('errors when no link is found', async () => {
    const context = makeContext({
      args: ['missing-lib'],
      options: { ...baseOptions },
    });

    let error: unknown;
    try {
      await libraryDisconnectCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'LINK_NOT_FOUND' });
  });
});

describe('library-status', () => {
  it('displays the connection status for a connected library', async () => {
    links.set('repo-1', {
      ...repositorySummary,
      libraryId: 'test-lib',
      linkedAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
      latestCommitSha: 'abc123',
      metadataUpdatedAt: '2026-01-02T00:00:00.000Z',
    });
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await libraryStatusCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Library "test-lib" connection status:'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('octocat/hello-world'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status: active'));
  });

  it('displays the latest publishing attempt status and workflow run', async () => {
    links.set('repo-1', {
      ...repositorySummary,
      libraryId: 'test-lib',
      linkedAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
    });
    await publishingAttemptStore.save({
      attemptId: 'attempt_1',
      libraryId: 'test-lib',
      kind: 'publish',
      status: 'failed',
      attemptNumber: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
      source: {
        repositoryId: 'repo-1',
        owner: 'octocat',
        name: 'hello-world',
        tag: 'v1.2.0',
        intendedVersion: '1.2.0',
      },
      workflowRun: {
        runId: '42',
        url: 'https://github.com/octocat/hello-world/actions/runs/42',
      },
      failure: { code: 'PUBLISH_FAILED', message: 'Registry unavailable.' },
    });
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await libraryStatusCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Latest publish: failed'));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('PUBLISH_FAILED: Registry unavailable.'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Workflow run: https://github.com/octocat/hello-world/actions/runs/42',
      ),
    );
  });

  it('errors when the library is not connected', async () => {
    const context = makeContext({
      args: ['unknown-lib'],
      options: { ...baseOptions },
    });

    let error: unknown;
    try {
      await libraryStatusCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'LIBRARY_NOT_CONNECTED' });
  });
});
