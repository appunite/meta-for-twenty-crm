import { createHmac } from 'node:crypto';

export const deriveVerifyToken = (appSecret: string): string =>
  createHmac('sha256', appSecret).update('meta-leads-verify').digest('base64url');

export const acceptedVerifyTokens = (env: {
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
}): string[] => [
  ...(env.META_VERIFY_TOKEN ? [env.META_VERIFY_TOKEN] : []),
  ...(env.META_APP_SECRET ? [deriveVerifyToken(env.META_APP_SECRET)] : []),
];
