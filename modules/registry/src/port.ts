import type { RegistrySnapshot } from './view/types.js';

/**
 * Client-safe boundary for reading registry data. Implementations own I/O;
 * consumers depend only on this contract so they can be tested with fixtures.
 */
export interface RegistryRepository {
  /** Load the complete, validated registry snapshot. */
  getSnapshot(): Promise<RegistrySnapshot>;
}
