import { describe, expect, it } from 'vitest';

import { resolveCallbackUrl } from 'src/utils/resolve-callback-url';

const DEFAULT_URL = 'http://localhost:3100/s/meta/leadgen';

describe('resolveCallbackUrl', () => {
  it('uses the address Twenty reports without an override', () => {
    expect(resolveCallbackUrl({ override: undefined, defaultUrl: DEFAULT_URL })).toBe(
      DEFAULT_URL,
    );
    expect(resolveCallbackUrl({ override: '  ', defaultUrl: DEFAULT_URL })).toBe(DEFAULT_URL);
  });

  it('adds the webhook path to a bare address', () => {
    expect(
      resolveCallbackUrl({
        override: 'https://abc.trycloudflare.com',
        defaultUrl: DEFAULT_URL,
      }),
    ).toBe('https://abc.trycloudflare.com/s/meta/leadgen');
    expect(
      resolveCallbackUrl({
        override: ' https://abc.trycloudflare.com/ ',
        defaultUrl: DEFAULT_URL,
      }),
    ).toBe('https://abc.trycloudflare.com/s/meta/leadgen');
  });

  it('keeps an override that already has a path', () => {
    expect(
      resolveCallbackUrl({
        override: 'https://abc.trycloudflare.com/s/meta/leadgen',
        defaultUrl: DEFAULT_URL,
      }),
    ).toBe('https://abc.trycloudflare.com/s/meta/leadgen');
  });

  it('keeps an override it cannot parse, so Meta reports it', () => {
    expect(resolveCallbackUrl({ override: 'not a url', defaultUrl: DEFAULT_URL })).toBe(
      'not a url',
    );
  });
});
