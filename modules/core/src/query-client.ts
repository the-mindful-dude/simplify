import { QueryClient } from '@tanstack/react-query';

/** Queries stay fresh for 30 seconds; unused queries are collected after 5 minutes. */
const STALE_TIME_MS = 30_000;
const GC_TIME_MS = 5 * 60_000;

/**
 * Creates a new QueryClient with explicit, bounded cache defaults.
 *
 * Every call returns a distinct instance with its own query and mutation
 * caches. Callers own the lifecycle (one per browser session or per request);
 * this module never exports or reuses a global client.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
      },
    },
  });
}
