import { describe, expect, it } from 'vitest';

import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';
import {
  type MetaGraphClient,
  type MetaSubscribedApp,
} from 'src/meta-client/meta-graph-client';
import { checkConnection } from 'src/utils/check-connection';

type FakePage = { name: string; apps: MetaSubscribedApp[]; formCount: number };

const fakeGraph = (pages: Record<string, FakePage | Error>) => {
  const requested: string[] = [];
  const page = (pageId: string): FakePage => {
    requested.push(pageId);

    const found = pages[pageId];

    if (found instanceof Error) {
      throw found;
    }

    return found;
  };

  const graph: Pick<
    MetaGraphClient,
    'getPage' | 'listSubscribedApps' | 'listPageForms'
  > = {
    getPage: async (pageId) => ({ id: pageId, name: page(pageId).name }),
    listSubscribedApps: async (pageId) => page(pageId).apps,
    listPageForms: async (pageId) =>
      Array.from({ length: page(pageId).formCount }, (_, index) => ({
        id: `F${index}`,
        name: `Form ${index}`,
        status: 'ACTIVE',
        questions: [],
      })),
  };

  return { graph, requested };
};

const LEADGEN_APP: MetaSubscribedApp = {
  id: '999',
  name: 'Acme Leads',
  subscribedFields: ['leadgen'],
};

const FULL_ENV = {
  META_APP_SECRET: 'secret',
  META_VERIFY_TOKEN: 'verify',
  META_PAGE_ACCESS_TOKEN: 'token',
  META_PAGE_ID: '111',
};

describe('checkConnection', () => {
  it('reports missing variables and skips the page check without a token', async () => {
    const { graph, requested } = fakeGraph({});

    const status = await checkConnection({
      env: { META_APP_SECRET: 'secret', META_VERIFY_TOKEN: '', META_PAGE_ID: '111' },
      graph,
    });

    expect(status).toEqual({
      variables: {
        appSecret: true,
        verifyToken: false,
        pageAccessToken: false,
        pageId: true,
      },
      page: null,
    });
    expect(requested).toEqual([]);
  });

  it('reports no page when the page id is blank', async () => {
    const { graph, requested } = fakeGraph({});

    const status = await checkConnection({
      env: { ...FULL_ENV, META_PAGE_ID: '  ' },
      graph,
    });

    expect(status.variables.pageId).toBe(false);
    expect(status.page).toBeNull();
    expect(requested).toEqual([]);
  });

  it('checks the name, leadgen subscription and forms of the page', async () => {
    const { graph } = fakeGraph({
      '111': { name: 'Acme Studio', apps: [LEADGEN_APP], formCount: 2 },
    });

    const status = await checkConnection({
      env: { ...FULL_ENV, META_PAGE_ID: ' 111 ' },
      graph,
    });

    expect(status.page).toEqual({
      pageId: '111',
      ok: true,
      name: 'Acme Studio',
      isLeadgenSubscribed: true,
      formCount: 2,
    });
  });

  it('reports a page that is not subscribed to leadgen', async () => {
    const { graph } = fakeGraph({
      '111': {
        name: 'Acme Shop',
        apps: [{ id: '999', name: 'Acme Leads', subscribedFields: ['feed'] }],
        formCount: 0,
      },
    });

    const status = await checkConnection({ env: FULL_ENV, graph });

    expect(status.page).toEqual({
      pageId: '111',
      ok: true,
      name: 'Acme Shop',
      isLeadgenSubscribed: false,
      formCount: 0,
    });
  });

  it('reports a failing page with a hint', async () => {
    const { graph } = fakeGraph({
      '111': new MetaGraphError({
        message: 'Error validating access token',
        code: 190,
        status: 400,
      }),
    });

    const status = await checkConnection({ env: FULL_ENV, graph });

    expect(status.page).toEqual({
      pageId: '111',
      ok: false,
      error: 'Error validating access token',
      hint: 'The page access token expired or was revoked. Generate a new one.',
    });
  });
});
