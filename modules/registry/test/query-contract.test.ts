import { RepositoryError } from '@simplify-dev/module-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  RegistryDataError,
  registryQueryKeys,
  registrySnapshotQueryOptions,
  toAsyncState,
  toRepositoryError,
  useRefreshRegistrySnapshot,
  useRegistrySnapshot,
  type RegistryRepository,
  type RegistrySnapshot,
} from '../src/index.js';

const snapshot: RegistrySnapshot = {
  generatedAt: '2026-01-02T03:04:05.000Z',
  schemaVersion: 1,
  assets: [],
  libraries: [],
  categoryCounts: [],
  manifestCount: 0,
  sourceFiles: [],
  manifestIssues: [],
};

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('query keys and options', () => {
  it('uses one stable key and calls the injected repository port', async () => {
    const repository: RegistryRepository = { getSnapshot: async () => snapshot };
    const options = registrySnapshotQueryOptions(repository);

    expect(registryQueryKeys.all).toEqual(['registry']);
    expect(registryQueryKeys.snapshot()).toEqual(['registry', 'snapshot']);
    expect(options.queryKey).toEqual(registryQueryKeys.snapshot());
    await expect(options.queryFn()).resolves.toBe(snapshot);
  });

  it('normalizes repository failures to a RepositoryError', async () => {
    const cause = new RegistryDataError(
      'index_invalid',
      'registry/index.json failed schema validation.',
    );
    const options = registrySnapshotQueryOptions({
      getSnapshot: async () => {
        throw cause;
      },
    });

    await expect(options.queryFn()).rejects.toMatchObject({
      code: 'invalid_input',
      cause,
      name: 'RepositoryError',
    });

    const mapped = toRepositoryError(cause);
    expect(mapped).toBeInstanceOf(RepositoryError);
    expect(mapped.details).toEqual({ registryCode: 'index_invalid' });
  });
});

describe('useRegistrySnapshot', () => {
  it('loads the snapshot through the port', async () => {
    const repository: RegistryRepository = { getSnapshot: async () => snapshot };
    const { result } = renderHook(() => useRegistrySnapshot(repository), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(snapshot);
  });

  it('surfaces a structured failure when the source is unreadable', async () => {
    const repository: RegistryRepository = {
      getSnapshot: async () => {
        throw new RegistryDataError('index_read_failed', 'Failed to read the registry index.');
      },
    };
    const { result } = renderHook(() => useRegistrySnapshot(repository), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(RepositoryError);
    expect(result.current.error?.code).toBe('unavailable');
  });
});

describe('useRefreshRegistrySnapshot', () => {
  it('invalidates only the snapshot query', async () => {
    const client = makeQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRefreshRegistrySnapshot(client), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(result.current.isSuccess).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: registryQueryKeys.snapshot() });
  });
});

describe('async state error mapping', () => {
  it('preserves a RepositoryError in the error state', () => {
    const error = toRepositoryError(new RegistryDataError('index_read_failed', 'Unreadable'));
    const state = toAsyncState({ isPending: false, isError: true, error, data: undefined });

    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBe(error);
      expect(state.error.code).toBe('unavailable');
    }
  });
});
