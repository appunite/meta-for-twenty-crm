import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

export type SignatureCheck = { valid: true } | { valid: false; error: string };

export const verifyMetaSignature = ({
  rawBody,
  signatureHeader,
  appSecret,
}: {
  rawBody: string;
  signatureHeader: string | undefined;
  appSecret: string;
}): SignatureCheck => {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing x-hub-signature-256 header' };
  }

  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return { valid: false, error: 'Signature must start with sha256=' };
  }

  const provided = Buffer.from(
    signatureHeader.slice(SIGNATURE_PREFIX.length),
    'hex',
  );
  const expected = createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest();

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { valid: false, error: 'Signature verification failed' };
  }

  return { valid: true };
};
