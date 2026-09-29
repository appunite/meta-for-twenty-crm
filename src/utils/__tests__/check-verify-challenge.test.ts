import { describe, expect, it } from 'vitest';

import { checkVerifyChallenge } from 'src/utils/check-verify-challenge';

const VERIFY_TOKEN = 'my-verify-token';

describe('checkVerifyChallenge', () => {
  it('echoes the challenge when mode and token match', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [VERIFY_TOKEN],
      }),
    ).toEqual({ status: 200, body: '1158201444' });
  });

  it('rejects a wrong token', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'guess',
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [VERIFY_TOKEN],
      }).status,
    ).toBe(403);
  });

  it('rejects a mode other than subscribe', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [VERIFY_TOKEN],
      }).status,
    ).toBe(403);
  });

  it('rejects a missing challenge', () => {
    expect(
      checkVerifyChallenge({
        query: { 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN },
        acceptedTokens: [VERIFY_TOKEN],
      }).status,
    ).toBe(400);
  });

  it('rejects everything when no verify token is configured', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': '',
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [''],
      }).status,
    ).toBe(403);
  });

  it('rejects everything when no token is accepted', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'anything',
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [],
      }).status,
    ).toBe(403);
  });

  it('accepts any of several tokens', () => {
    expect(
      checkVerifyChallenge({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'derived-token',
          'hub.challenge': '1158201444',
        },
        acceptedTokens: [VERIFY_TOKEN, 'derived-token'],
      }),
    ).toEqual({ status: 200, body: '1158201444' });
  });
});
