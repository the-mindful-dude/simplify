import { RepositoryError, type RepositoryErrorCode } from '@simplify-dev/module-core';

/** Stable causes of an unusable registry source; safe to map to public copy. */
export type RegistryDataErrorCode =
  'registry_source_not_found' | 'index_read_failed' | 'index_invalid';

/**
 * Raised on the server when the local registry source cannot be turned into a
 * usable snapshot. Carries only a stable code and a non-sensitive message; the
 * web layer maps the code to static copy.
 */
export class RegistryDataError extends Error {
  readonly code: RegistryDataErrorCode;

  constructor(code: RegistryDataErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RegistryDataError';
    this.code = code;
  }
}

const REPOSITORY_CODES: Readonly<Record<RegistryDataErrorCode, RepositoryErrorCode>> = {
  registry_source_not_found: 'not_found',
  index_read_failed: 'unavailable',
  index_invalid: 'invalid_input',
};

/**
 * Convert a repository failure into the cross-domain error used by hook state.
 * The original failure stays available as `cause`; callers present `code`, not
 * raw diagnostics.
 */
export function toRepositoryError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) {
    return error;
  }
  if (error instanceof RegistryDataError) {
    return new RepositoryError({
      code: REPOSITORY_CODES[error.code],
      message: error.message,
      cause: error,
      details: { registryCode: error.code },
    });
  }
  return new RepositoryError({
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Registry request failed',
    cause: error,
  });
}
