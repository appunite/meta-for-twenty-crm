import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  acceptedVerifyTokens,
  deriveVerifyToken,
} from 'src/utils/derive-verify-token';

describe('deriveVerifyToken', () => {
  it('is the base64url HMAC-SHA256 of a fixed label keyed by the app secret', () => {
    expect(deriveVerifyToken('app-secret')).toBe(
      createHmac('sha256', 'app-secret').update('meta-leads-verify').digest('base64url'),
    );
  });

  it('differs between app secrets', () => {
    expect(deriveVerifyToken('one')).not.toBe(deriveVerifyToken('two'));
  });
});

describe('acceptedVerifyTokens', () => {
  it('accepts the stored token and the derived one', () => {
    expect(
      acceptedVerifyTokens({ META_VERIFY_TOKEN: 'stored', META_APP_SECRET: 'secret' }),
    ).toEqual(['stored', deriveVerifyToken('secret')]);
  });

  it('accepts only the derived token when none is stored', () => {
    expect(acceptedVerifyTokens({ META_APP_SECRET: 'secret' })).toEqual([
      deriveVerifyToken('secret'),
    ]);
  });

  it('accepts nothing without a secret or a stored token', () => {
    expect(acceptedVerifyTokens({ META_VERIFY_TOKEN: '', META_APP_SECRET: '' })).toEqual([]);
  });
});
