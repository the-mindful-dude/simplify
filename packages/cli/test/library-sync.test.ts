import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadGitHubAppConfig } from '@simplify-dev/github';
import { librarySyncCommand } from '../src/commands/library-sync.js';
import { developmentSnapshotStore } from '../src/commands/library-sync.js';
import { publishingAttemptStore, resetPublishingState } from '../src/publishing.js';
import type { CommandContext } from '../src/cli.js';

const links = new Map<string, any>();
const mockGetLatestCommitSha = vi.fn();

vi.mock('@simplify-dev/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplify-dev/github')>();
  const createGitHubAppClient = vi.fn((): any => ({
    getLatestCommitSha: mockGetLatestCommitSha,
    createInstallationToken: vi.fn(),
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
    ...actual,
    createGitHubAppClient,
    loadGitHubAppConfig: loadGitHubAppConfigMock,
    GitHubConnectionService,
    InMemoryRepositoryLinkStore,
  };
});

vi.mock('@simplify-dev/registry', () => ({
  validateDevelopmentSnapshot: vi.fn((value: any) => ({ valid: true, value, issues: [] })),
}));

import { validateDevelopmentSnapshot } from '@simplify-dev/registry';

const mockValidateDevelopmentSnapshot = validateDevelopmentSnapshot as ReturnType<typeof vi.fn>;

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

beforeEach(async () => {
  links.clear();
  developmentSnapshotStore.clear();
  resetPublishingState();
  testDir = await fs.mkdtemp(join(tmpdir(), 'simplify-sync-'));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mockGetLatestCommitSha.mockReset();
  mockGetLatestCommitSha.mockResolvedValue('abc123def4567890abc123def4567890abc12345');
  mockValidateDevelopmentSnapshot.mockReset();
  mockValidateDevelopmentSnapshot.mockReturnValue({ valid: true, value: {}, issues: [] });
  vi.mocked(loadGitHubAppConfig).mockReset();
  vi.mocked(loadGitHubAppConfig).mockReturnValue({
    appId: 1,
    privateKey: 'private-key',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookSecret: 'webhook-secret',
  });
  links.set('repo-1', { ...repositoryLink });
});

afterEach(async () => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  await fs.rm(testDir, { recursive: true, force: true });
});

const baseOptions = {
  'installation-id': '123',
  'target-dir': testDir,
} as Record<string, string | boolean>;

describe('library-sync', () => {
  it('synchronizes a development snapshot from the default branch', async () => {
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await librarySyncCommand.handler(context);

    expect(mockGetLatestCommitSha).toHaveBeenCalledWith(123, 'octocat', 'hello-world', 'main');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Synchronized development snapshot: main@abc123def4567890abc123def4567890abc12345',
      ),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Snapshot kind: development (does not affect stable version resolution)',
      ),
    );

    const snapshot = await developmentSnapshotStore.latestForBranch('test-lib', 'main');
    expect(snapshot).toBeDefined();
    expect(snapshot!.libraryId).toBe('test-lib');
    expect(snapshot!.branch).toBe('main');
    expect(snapshot!.commitSha).toBe('abc123def4567890abc123def4567890abc12345');
    expect(snapshot!.kind).toBe('development');
    expect(mockValidateDevelopmentSnapshot).toHaveBeenCalledTimes(1);

    const attempt = await publishingAttemptStore.latest('test-lib', 'synchronization');
    expect(attempt?.status).toBe('successful');
    expect(attempt?.source?.commitSha).toBe('abc123def4567890abc123def4567890abc12345');
    expect(attempt?.source?.branch).toBe('main');
  });

  it('synchronizes a configured branch when --branch is provided', async () => {
    mockGetLatestCommitSha.mockResolvedValue('fedcba0987654321fedcba0987654321fedcba09');
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions, branch: 'develop' },
    });

    await librarySyncCommand.handler(context);

    expect(mockGetLatestCommitSha).toHaveBeenCalledWith(123, 'octocat', 'hello-world', 'develop');
    const snapshot = await developmentSnapshotStore.latestForBranch('test-lib', 'develop');
    expect(snapshot!.branch).toBe('develop');
    expect(snapshot!.commitSha).toBe('fedcba0987654321fedcba0987654321fedcba09');
  });

  it('is idempotent: syncing the same commit twice is a no-op', async () => {
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await librarySyncCommand.handler(context);
    await librarySyncCommand.handler(context);

    expect(mockGetLatestCommitSha).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('already up to date: main@abc123def4567890abc123def4567890abc12345'),
    );

    const snapshot = await developmentSnapshotStore.latestForBranch('test-lib', 'main');
    expect(snapshot!.commitSha).toBe('abc123def4567890abc123def4567890abc12345');
  });

  it('records a failed synchronization attempt when commit lookup fails', async () => {
    mockGetLatestCommitSha.mockRejectedValue(new Error('commit lookup failed'));
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    await expect(librarySyncCommand.handler(context)).rejects.toMatchObject({
      code: 'FETCH_COMMIT_FAILED',
    });

    const attempt = await publishingAttemptStore.latest('test-lib', 'synchronization');
    expect(attempt?.status).toBe('failed');
    expect(attempt?.failure?.code).toBe('FETCH_COMMIT_FAILED');
    expect(attempt?.failure?.message).toContain('commit lookup failed');
  });

  it('errors when the library is not connected to a repository', async () => {
    links.clear();
    const context = makeContext({
      args: ['unknown-lib'],
      options: { ...baseOptions },
    });

    let error: unknown;
    try {
      await librarySyncCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'NOT_CONNECTED' });
    expect((error as Error).message).toContain('not connected to a GitHub repository');
    expect(mockGetLatestCommitSha).not.toHaveBeenCalled();
  });

  it('errors when GitHub App configuration is incomplete', async () => {
    vi.mocked(loadGitHubAppConfig).mockImplementation(() => {
      throw new Error('no config');
    });
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
    });

    let error: unknown;
    try {
      await librarySyncCommand.handler(context);
    } catch (err) {
      error = err;
    }

    expect(error).toMatchObject({ code: 'CONFIG_INCOMPLETE' });
  });

  it('supports dry-run mode without recording a snapshot', async () => {
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
      dryRun: true,
    });

    await librarySyncCommand.handler(context);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry-run complete.'));
    const snapshot = await developmentSnapshotStore.latestForBranch('test-lib', 'main');
    expect(snapshot).toBeUndefined();
  });

  it('outputs json when --json is passed', async () => {
    const context = makeContext({
      args: ['test-lib'],
      options: { ...baseOptions },
      json: true,
    });

    await librarySyncCommand.handler(context);

    const jsonCall = logSpy.mock.calls.find((args) => {
      if (typeof args[0] !== 'string') return false;
      try {
        return JSON.parse(args[0]!).libraryId === 'test-lib';
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.libraryId).toBe('test-lib');
    expect(parsed.status).toBe('synced');
    expect(parsed.created).toBe(true);
  });
});
