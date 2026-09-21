import { describe, expect, it } from 'vitest';

import { type ConnectionStatus } from 'src/utils/check-connection';
import { connectionIssues } from 'src/utils/connection-issues';

const ALL_SET = {
  appSecret: true,
  verifyToken: true,
  pageAccessToken: true,
  pageId: true,
};

describe('connectionIssues', () => {
  it('has no issues when everything is set up', () => {
    const status: ConnectionStatus = {
      variables: ALL_SET,
      page: {
        pageId: '111',
        ok: true,
        name: 'Acme Studio',
        isLeadgenSubscribed: true,
        formCount: 2,
      },
    };

    expect(connectionIssues(status)).toEqual([]);
  });

  it('lists every missing setting', () => {
    expect(
      connectionIssues({
        variables: {
          appSecret: false,
          verifyToken: false,
          pageAccessToken: false,
          pageId: false,
        },
        page: null,
      }),
    ).toEqual([
      'Fill in the Meta app secret.',
      'Fill in the webhook verify token.',
      'Fill in the page access token.',
      'Fill in the Facebook Page ID.',
    ]);
  });

  it('prefers the hint over the raw error', () => {
    const status: ConnectionStatus = {
      variables: ALL_SET,
      page: {
        pageId: '111',
        ok: false,
        error: 'Error validating access token',
        hint: 'The page access token expired or was revoked. Generate a new one.',
      },
    };

    expect(connectionIssues(status)).toEqual([
      'Page 111: The page access token expired or was revoked. Generate a new one.',
    ]);
  });

  it('falls back to the raw error without a hint', () => {
    const status: ConnectionStatus = {
      variables: ALL_SET,
      page: { pageId: '222', ok: false, error: 'socket hang up' },
    };

    expect(connectionIssues(status)).toEqual(['Page 222: socket hang up']);
  });

  it('describes a page that is reachable but not ready', () => {
    const status: ConnectionStatus = {
      variables: ALL_SET,
      page: {
        pageId: '333',
        ok: true,
        name: 'Acme Shop',
        isLeadgenSubscribed: false,
        formCount: 0,
      },
    };

    expect(connectionIssues(status)).toEqual([
      'Acme Shop is not subscribed to lead notifications. See setup step 9.',
      'Acme Shop has no lead forms yet.',
    ]);
  });
});
