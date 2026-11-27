import type { RegistryRepository } from '../port.js';
import { toRepositoryError } from '../errors.js';
import type { RegistrySnapshot } from '../view/types.js';
import { registryQueryKeys } from './keys.js';

/**
 * The single query definition shared by the hook and by tests. Repository
 * failures are normalized so every consumer sees a `RepositoryError`.
 */
export function registrySnapshotQueryOptions(repository: RegistryRepository) {
  return {
    queryKey: registryQueryKeys.snapshot(),
    queryFn: async (): Promise<RegistrySnapshot> => {
      try {
        return await repository.getSnapshot();
      } catch (error) {
        throw toRepositoryError(error);
      }
    },
  } as const;
}
