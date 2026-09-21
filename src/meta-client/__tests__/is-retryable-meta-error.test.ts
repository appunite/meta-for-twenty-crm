import { describe, expect, it } from 'vitest';

import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';
import { isRetryableMetaError } from 'src/meta-client/is-retryable-meta-error';

const graphError = (code: number | undefined, status = 400) =>
  new MetaGraphError({ message: 'x', code, status });

describe('isRetryableMetaError', () => {
  it.each([
    ['temporary API error', graphError(2)],
    ['app rate limit', graphError(4)],
    ['user rate limit', graphError(17)],
    ['page rate limit', graphError(32)],
    ['custom rate limit', graphError(613)],
    ['LeadGen business use case limit', graphError(80005)],
    ['server error without code', graphError(undefined, 503)],
    ['network failure', new TypeError('fetch failed')],
  ])('retries a %s', (_label, error) => {
    expect(isRetryableMetaError(error)).toBe(true);
  });

  it.each([
    ['revoked CRM access', graphError(103, 403)],
    ['missing permission', graphError(100)],
    ['expired token', graphError(190, 401)],
    ['plain error', new Error('META_PAGE_ACCESS_TOKEN is not configured')],
  ])('does not retry %s', (_label, error) => {
    expect(isRetryableMetaError(error)).toBe(false);
  });
});
