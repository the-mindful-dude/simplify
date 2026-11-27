import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { RepositoryError } from '@simplify-dev/module-core';

import type { RegistryRepository } from '../port.js';
import type { RegistrySnapshot } from '../view/types.js';
import { registryQueryKeys } from './keys.js';
import { registrySnapshotQueryOptions } from './options.js';

/** Read the registry snapshot through the injected repository port. */
export function useRegistrySnapshot(
  repository: RegistryRepository,
  options?: Omit<UseQueryOptions<RegistrySnapshot, RepositoryError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({ ...registrySnapshotQueryOptions(repository), ...options });
}

/**
 * Invalidate the cached snapshot after a local registry source change. The
 * repository is read-only; refresh is the only supported mutation.
 */
export function useRefreshRegistrySnapshot(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: registryQueryKeys.snapshot() });
    },
  });
}
