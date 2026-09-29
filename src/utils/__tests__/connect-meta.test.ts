import { describe, expect, it } from 'vitest';

import { MetaGraphError } from 'src/meta-client/graph-request';
import {
  type MetaManagedPage,
  type MetaSetupClient,
  type MetaTokenInfo,
} from 'src/meta-client/meta-setup-client';
import { connectMeta, REQUIRED_PERMISSIONS } from 'src/utils/connect-meta';
import { deriveVerifyToken } from 'src/utils/derive-verify-token';

const USER_TOKEN_INFO: MetaTokenInfo = {
  isValid: true,
  appId: '123',
  type: 'USER',
  expiresAt: 1790000000,
  scopes: [...REQUIRED_PERMISSIONS],
  granularScopes: [],
};

const PAGE_TOKEN_INFO: MetaTokenInfo = {
  ...USER_TOKEN_INFO,
  type: 'PAGE',
  expiresAt: 0,
};

const ACME: MetaManagedPage = {
  id: '111',
  name: 'Acme',
  accessToken: 'acme-page-token',
  tasks: ['MANAGE'],
};

const BETA: MetaManagedPage = {
  id: '222',
  name: 'Beta',
  accessToken: 'beta-page-token',
  tasks: ['MANAGE'],
};

type Overrides = Partial<{
  userTokenInfo: MetaTokenInfo | Error;
  pageTokenInfo: MetaTokenInfo | Error;
  exchange: string | Error;
  pages: MetaManagedPage[] | Error;
  webhook: Error;
  pageSubscription: Error;
}>;

const fakeGraph = (overrides: Overrides = {}) => {
  const calls: { method: string; input: unknown }[] = [];
  const answer = <T>(value: T | Error): T => {
    if (value instanceof Error) {
      throw value;
    }

    return value;
  };

  const graph: MetaSetupClient = {
    debugToken: async (input) => {
      calls.push({ method: 'debugToken', input });

      return input.inputToken === 'user-token'
        ? answer(overrides.userTokenInfo ?? USER_TOKEN_INFO)
        : answer(overrides.pageTokenInfo ?? PAGE_TOKEN_INFO);
    },
    exchangeForLongLivedUserToken: async (input) => {
      calls.push({ method: 'exchange', input });

      return answer(overrides.exchange ?? 'long-lived-token');
    },
    listManagedPages: async (input) => {
      calls.push({ method: 'listManagedPages', input });

      return answer(overrides.pages ?? [ACME]);
    },
    subscribeAppToPageWebhook: async (input) => {
      calls.push({ method: 'webhook', input });

      if (overrides.webhook) {
        throw overrides.webhook;
      }
    },
    subscribePageToLeadgen: async (input) => {
      calls.push({ method: 'pageSubscription', input });

      if (overrides.pageSubscription) {
        throw overrides.pageSubscription;
      }
    },
  };

  return { graph, calls };
};

const CALLBACK_URL = 'https://crm.example.com/s/meta/leadgen';

const connect = (graph: MetaSetupClient, input: Partial<Parameters<typeof connectMeta>[0]> = {}) =>
  connectMeta({
    graph,
    appSecret: 'app-secret',
    userToken: 'user-token',
    callbackUrl: CALLBACK_URL,
    ...input,
  });

const lastStep = (result: Awaited<ReturnType<typeof connectMeta>>) =>
  result.steps[result.steps.length - 1];

const stepStatuses = (result: Awaited<ReturnType<typeof connectMeta>>) =>
  Object.fromEntries(result.steps.map((step) => [step.id, step.status]));

describe('connectMeta', () => {
  it('connects a single Page end to end and returns its never-expiring token', async () => {
    const { graph, calls } = fakeGraph();

    const result = await connect(graph);

    expect(stepStatuses(result)).toEqual({
      userToken: 'ok',
      longLivedToken: 'ok',
      page: 'ok',
      pageToken: 'ok',
      webhook: 'ok',
      pageSubscription: 'ok',
    });
    expect(result.connection).toEqual({
      pageId: '111',
      pageName: 'Acme',
      pageAccessToken: 'acme-page-token',
    });
    expect(calls).toEqual([
      { method: 'debugToken', input: { inputToken: 'user-token', accessToken: 'user-token' } },
      {
        method: 'exchange',
        input: { appId: '123', appSecret: 'app-secret', userToken: 'user-token' },
      },
      { method: 'listManagedPages', input: 'long-lived-token' },
      {
        method: 'debugToken',
        input: { inputToken: 'acme-page-token', accessToken: '123|app-secret' },
      },
      {
        method: 'webhook',
        input: {
          appId: '123',
          appAccessToken: '123|app-secret',
          callbackUrl: CALLBACK_URL,
          verifyToken: deriveVerifyToken('app-secret'),
        },
      },
      {
        method: 'pageSubscription',
        input: { pageId: '111', pageAccessToken: 'acme-page-token' },
      },
    ]);
  });

  it('asks for the app secret before calling Meta', async () => {
    const { graph, calls } = fakeGraph();

    const result = await connect(graph, { appSecret: '' });

    expect(result.steps).toEqual([
      expect.objectContaining({
        id: 'userToken',
        status: 'failed',
        detail: expect.stringContaining('Meta app secret'),
      }),
    ]);
    expect(calls).toEqual([]);
  });

  it('asks for a token when none was pasted', async () => {
    const { graph, calls } = fakeGraph();

    const result = await connect(graph, { userToken: '  ' });

    expect(result.steps[0]).toMatchObject({ id: 'userToken', status: 'failed' });
    expect(calls).toEqual([]);
  });

  it('trims the pasted token', async () => {
    const { graph, calls } = fakeGraph();

    await connect(graph, { userToken: ' user-token\n' });

    expect(calls[0].input).toEqual({ inputToken: 'user-token', accessToken: 'user-token' });
  });

  it('names every missing permission', async () => {
    const { graph } = fakeGraph({
      userTokenInfo: {
        ...USER_TOKEN_INFO,
        scopes: ['pages_show_list', 'pages_read_engagement', 'ads_management'],
      },
    });

    const result = await connect(graph);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe('failed');
    expect(result.steps[0].detail).toContain(
      'leads_retrieval, pages_manage_metadata, pages_manage_ads',
    );
  });

  it('rejects a Page token pasted instead of a User token', async () => {
    const { graph } = fakeGraph({
      userTokenInfo: { ...USER_TOKEN_INFO, type: 'PAGE' },
    });

    const result = await connect(graph);

    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      detail: expect.stringContaining('User token'),
    });
  });

  it('reports an invalid token with the reason Meta gives', async () => {
    const { graph } = fakeGraph({
      userTokenInfo: { ...USER_TOKEN_INFO, isValid: false, error: 'Session has expired' },
    });

    const result = await connect(graph);

    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      detail: expect.stringContaining('Session has expired'),
    });
  });

  it('reports a token Meta refuses to inspect', async () => {
    const { graph } = fakeGraph({
      userTokenInfo: new MetaGraphError({
        message: 'Invalid OAuth access token',
        code: 190,
        status: 400,
      }),
    });

    const result = await connect(graph);

    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      detail: expect.stringContaining('Invalid OAuth access token'),
    });
  });

  it('points at the app secret when the exchange fails', async () => {
    const { graph } = fakeGraph({
      exchange: new MetaGraphError({
        message: 'Error validating client secret.',
        code: 1,
        status: 400,
      }),
    });

    const result = await connect(graph);

    expect(stepStatuses(result)).toEqual({ userToken: 'ok', longLivedToken: 'failed' });
    expect(result.steps[1].detail).toContain('Error validating client secret.');
    expect(result.steps[1].detail).toContain('app secret');
  });

  it('explains that no Page was shared with the app', async () => {
    const { graph } = fakeGraph({ pages: [] });

    const result = await connect(graph);

    expect(lastStep(result)).toMatchObject({
      id: 'page',
      status: 'failed',
      detail: expect.stringContaining('tick your Page'),
    });
    expect(result.connection).toBeUndefined();
  });

  it('returns the Pages to choose from when there are several', async () => {
    const { graph, calls } = fakeGraph({ pages: [ACME, BETA] });

    const result = await connect(graph);

    expect(result.pages).toEqual([
      { id: '111', name: 'Acme' },
      { id: '222', name: 'Beta' },
    ]);
    expect(lastStep(result)).toMatchObject({ id: 'page', status: 'warning' });
    expect(result.connection).toBeUndefined();
    expect(calls.map((call) => call.method)).not.toContain('webhook');
  });

  it('connects the chosen Page', async () => {
    const { graph } = fakeGraph({ pages: [ACME, BETA] });

    const result = await connect(graph, { pageId: '222' });

    expect(result.connection).toEqual({
      pageId: '222',
      pageName: 'Beta',
      pageAccessToken: 'beta-page-token',
    });
    expect(result.pages).toBeUndefined();
  });

  it('fails when the chosen Page is not available to the token', async () => {
    const { graph } = fakeGraph({ pages: [ACME] });

    const result = await connect(graph, { pageId: '999' });

    expect(lastStep(result)).toMatchObject({ id: 'page', status: 'failed' });
  });

  it('warns but carries on when the Page token expires', async () => {
    const { graph } = fakeGraph({
      pageTokenInfo: { ...PAGE_TOKEN_INFO, expiresAt: 1790000000 },
    });

    const result = await connect(graph);

    expect(stepStatuses(result).pageToken).toBe('warning');
    expect(stepStatuses(result).webhook).toBe('ok');
    expect(result.connection?.pageAccessToken).toBe('acme-page-token');
  });

  it('refuses a callback URL that is not https without calling Meta', async () => {
    const { graph, calls } = fakeGraph();

    const result = await connect(graph, { callbackUrl: 'http://localhost:3100/s/meta/leadgen' });

    expect(result.steps.find((step) => step.id === 'webhook')).toMatchObject({
      status: 'failed',
      detail: expect.stringContaining('https'),
    });
    expect(calls.map((call) => call.method)).not.toContain('webhook');
    expect(stepStatuses(result).pageSubscription).toBe('ok');
    expect(result.connection).toBeDefined();
  });

  it('still subscribes the Page and returns the token when the webhook fails', async () => {
    const { graph } = fakeGraph({
      webhook: new MetaGraphError({
        message: 'The URL couldn\'t be validated.',
        code: 2200,
        status: 400,
      }),
    });

    const result = await connect(graph);

    expect(stepStatuses(result)).toMatchObject({ webhook: 'failed', pageSubscription: 'ok' });
    expect(result.steps.find((step) => step.id === 'webhook')?.detail).toContain(
      'couldn\'t be validated',
    );
    expect(result.connection).toBeDefined();
  });

  it('names pages_manage_metadata when the Page subscription is refused', async () => {
    const { graph } = fakeGraph({
      pageSubscription: new MetaGraphError({
        message: '(#200) Requires pages_manage_metadata permission',
        code: 200,
        status: 403,
      }),
    });

    const result = await connect(graph);

    expect(lastStep(result)).toMatchObject({
      id: 'pageSubscription',
      status: 'failed',
      detail: expect.stringContaining('pages_manage_metadata'),
    });
  });
});

describe('connectMeta messages', () => {
  it('does not double the full stop after a Meta message that ends with one', async () => {
    const { graph } = fakeGraph({
      webhook: new MetaGraphError({ message: 'Bad Gateway.', code: 2200, status: 400 }),
    });

    const result = await connect(graph);

    expect(result.steps.find((step) => step.id === 'webhook')?.detail).toBe(
      `Bad Gateway. Meta has to reach ${CALLBACK_URL} from the internet.`,
    );
  });

  it('ends a Meta message without a full stop before adding advice', async () => {
    const { graph } = fakeGraph({
      webhook: new MetaGraphError({ message: 'Bad Gateway', code: 2200, status: 400 }),
    });

    const result = await connect(graph);

    expect(result.steps.find((step) => step.id === 'webhook')?.detail).toBe(
      `Bad Gateway. Meta has to reach ${CALLBACK_URL} from the internet.`,
    );
  });
});
