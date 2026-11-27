import type { RepositoryError } from './errors.js';

/** The request has been started but no result is available yet. */
export interface AsyncLoadingState {
  readonly status: 'loading';
}

/** The request succeeded but produced no usable value. */
export interface AsyncEmptyState {
  readonly status: 'empty';
}

/** The request failed. Repositories wrap transport and parsing failures in `RepositoryError`. */
export interface AsyncErrorState {
  readonly status: 'error';
  readonly error: RepositoryError;
}

/** The request succeeded with a value. */
export interface AsyncSuccessState<T> {
  readonly status: 'success';
  readonly data: T;
}

/**
 * The cross-domain result contract returned by repository ports and consumed by
 * domain view mappers. `status` is the sole discriminant; each branch exposes
 * only the data that is meaningful for that state.
 */
export type AsyncState<T> =
  AsyncLoadingState | AsyncEmptyState | AsyncErrorState | AsyncSuccessState<T>;
