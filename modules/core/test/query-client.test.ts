import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from '../src/index.js';

describe('createAppQueryClient', () => {
  it('returns a distinct QueryClient with isolated caches on every call', () => {
    const first = createAppQueryClient();
    const second = createAppQueryClient();

    expect(first).toBeInstanceOf(QueryClient);
    expect(second).toBeInstanceOf(QueryClient);
    expect(first).not.toBe(second);
    expect(first.getQueryCache()).not.toBe(second.getQueryCache());
    expect(first.getMutationCache()).not.toBe(second.getMutationCache());
  });

  it('sets explicit staleTime and gcTime defaults', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
  });

  it('does not share cached data between clients', () => {
    const first = createAppQueryClient();
    const second = createAppQueryClient();

    first.setQueryData(['probe'], { value: 'first' });

    expect(first.getQueryData(['probe'])).toEqual({ value: 'first' });
    expect(second.getQueryData(['probe'])).toBeUndefined();
  });
});
