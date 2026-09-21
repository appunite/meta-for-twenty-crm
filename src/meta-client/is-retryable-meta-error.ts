import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';

// Temporary API errors and throttling, see Graph API error codes
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

const isBusinessUseCaseLimit = (code: number) => code >= 80000 && code <= 80014;

export const isRetryableMetaError = (error: unknown): boolean => {
  if (error instanceof MetaGraphError) {
    if (error.code !== undefined) {
      return RETRYABLE_CODES.has(error.code) || isBusinessUseCaseLimit(error.code);
    }

    return error.status >= 500;
  }

  // fetch rejects with a TypeError on network failures
  return error instanceof TypeError;
};
