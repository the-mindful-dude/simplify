import type { AsyncState, RepositoryError } from '@simplify-dev/module-core';

import { toRepositoryError } from './errors.js';
import type { RegistrySnapshot } from './view/types.js';

/** The subset of a query result needed to map it to a domain state. */
export interface QueryStateLike<T> {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly error: RepositoryError | null;
  readonly data: T | undefined;
}

/** A snapshot with no assets and no libraries has nothing to render. */
export function isRegistrySnapshotEmpty(snapshot: RegistrySnapshot): boolean {
  return snapshot.assets.length === 0 && snapshot.libraries.length === 0;
}

/**
 * Map query state to the cross-domain `AsyncState`. `status` is the only
 * discriminant; callers provide a domain-specific emptiness check when needed.
 */
export function toAsyncState<T>(
  query: QueryStateLike<T>,
  isEmpty?: (data: T) => boolean,
): AsyncState<T> {
  if (query.isPending) {
    return { status: 'loading' };
  }
  if (query.isError) {
    return { status: 'error', error: toRepositoryError(query.error) };
  }
  if (query.data === undefined || (isEmpty?.(query.data) ?? false)) {
    return { status: 'empty' };
  }
  return { status: 'success', data: query.data };
}
