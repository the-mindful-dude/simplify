/** Stable, machine-readable reasons a repository can fail. */
export type RepositoryErrorCode =
  'not_found' | 'invalid_input' | 'unavailable' | 'conflict' | 'unknown';

/** Context for a repository failure. Values must not contain secrets or credentials. */
export interface RepositoryErrorOptions {
  readonly code: RepositoryErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Structured failure returned by repository ports. It preserves the original
 * cause for diagnostics while exposing a stable `code` for domain state mapping.
 * `details` is defensively copied and frozen, and must never contain secrets.
 */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(options: RepositoryErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'RepositoryError';
    this.code = options.code;
    this.details = Object.freeze({ ...(options.details ?? {}) });
  }
}
