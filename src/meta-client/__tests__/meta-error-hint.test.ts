import { describe, expect, it } from 'vitest';

import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';
import { metaErrorHint } from 'src/meta-client/meta-error-hint';

const graphError = (code: number, subcode?: number) =>
  new MetaGraphError({ message: 'Graph error', code, subcode, status: 400 });

describe('metaErrorHint', () => {
  it('explains an expired or revoked token', () => {
    expect(metaErrorHint(graphError(190))).toBe(
      'The page access token expired or was revoked. Generate a new one.',
    );
  });

  it('explains a Leads Access block', () => {
    expect(metaErrorHint(graphError(103))).toBe(
      'Meta blocked lead access. Assign your Meta app as a CRM in Leads Access.',
    );
  });

  it('explains a missing permission', () => {
    const hint =
      'The page access token is missing a permission. See the setup guide for the list.';

    expect(metaErrorHint(graphError(10))).toBe(hint);
    expect(metaErrorHint(graphError(200))).toBe(hint);
    expect(metaErrorHint(graphError(299))).toBe(hint);
  });

  it('explains an unknown Page ID', () => {
    expect(metaErrorHint(graphError(100, 33))).toBe(
      'The Page ID is wrong or the token has no access to this Page.',
    );
  });

  it('explains a user ID or user token used instead of a Page', () => {
    const error = new MetaGraphError({
      message: '(#100) Tried accessing nonexisting field (subscribed_apps)',
      code: 100,
      status: 400,
    });

    expect(metaErrorHint(error)).toBe(
      'This is not a Page, or the token is a user token. Use the id and access_token of your Page from me/accounts.',
    );
  });

  it('has no hint for other errors', () => {
    expect(metaErrorHint(graphError(100))).toBeUndefined();
    expect(metaErrorHint(new Error('socket hang up'))).toBeUndefined();
  });
});
