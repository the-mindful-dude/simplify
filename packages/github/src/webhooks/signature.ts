import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeWebhookSignature(secret: string, payload: string | Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function verifyWebhookSignature(
  secret: string,
  payload: string | Buffer,
  signature: string | null | undefined,
): boolean {
  if (!signature) {
    return false;
  }

  const expected = computeWebhookSignature(secret, payload);

  try {
    return timingSafeEqual(Buffer.from(signature, 'ascii'), Buffer.from(expected, 'ascii'));
  } catch {
    return false;
  }
}
