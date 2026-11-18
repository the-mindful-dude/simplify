import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

/**
 * Generate an opaque simplify.dev publishing token. The plaintext value is
 * returned to the caller exactly once and is never stored.
 */
export function generatePublishingToken(): string {
  return `simp_pub_${randomBytes(TOKEN_BYTES).toString('base64url')}`;
}

/**
 * Produce a stable fingerprint for a publishing token so credentials can be
 * looked up and revoked without persisting the secret itself.
 */
export function fingerprintPublishingToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
