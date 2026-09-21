import { describe, expect, it } from 'vitest';

import { verifyMetaSignature } from 'src/utils/verify-meta-signature';

const APP_SECRET = 'test-app-secret';
const RAW_BODY = '{"object":"page","entry":[]}';
// printf '%s' "$RAW_BODY" | openssl dgst -sha256 -hmac "$APP_SECRET"
const VALID_HEX =
  '1a82db3abc2fa71a3fffecfedef579a8468a44850cd8a83a0c56974faff81689';

describe('verifyMetaSignature', () => {
  it('accepts a valid sha256= signature', () => {
    expect(
      verifyMetaSignature({
        rawBody: RAW_BODY,
        signatureHeader: `sha256=${VALID_HEX}`,
        appSecret: APP_SECRET,
      }),
    ).toEqual({ valid: true });
  });

  it('rejects a body that differs from the signed one', () => {
    expect(
      verifyMetaSignature({
        rawBody: '{"object":"page","entry":[{}]}',
        signatureHeader: `sha256=${VALID_HEX}`,
        appSecret: APP_SECRET,
      }).valid,
    ).toBe(false);
  });

  it('rejects a signature made with another secret', () => {
    expect(
      verifyMetaSignature({
        rawBody: RAW_BODY,
        signatureHeader: `sha256=${VALID_HEX}`,
        appSecret: 'other-secret',
      }).valid,
    ).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(
      verifyMetaSignature({
        rawBody: RAW_BODY,
        signatureHeader: undefined,
        appSecret: APP_SECRET,
      }),
    ).toEqual({ valid: false, error: 'Missing x-hub-signature-256 header' });
  });

  it('rejects a truncated signature', () => {
    expect(
      verifyMetaSignature({
        rawBody: RAW_BODY,
        signatureHeader: `sha256=${VALID_HEX.slice(0, 20)}`,
        appSecret: APP_SECRET,
      }).valid,
    ).toBe(false);
  });

  it('rejects a signature without the sha256= prefix', () => {
    expect(
      verifyMetaSignature({
        rawBody: RAW_BODY,
        signatureHeader: VALID_HEX,
        appSecret: APP_SECRET,
      }).valid,
    ).toBe(false);
  });
});
