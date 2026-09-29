import { describe, expect, it } from 'vitest';

import { MetaGraphError } from 'src/meta-client/graph-request';
import { HttpMetaSetupClient } from 'src/meta-client/http-meta-setup-client';

type RecordedRequest = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  form?: URLSearchParams;
};

const stubFetch = (responses: { status: number; body: unknown }[]) => {
  const requests: RecordedRequest[] = [];
  let index = 0;

  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: new URL(String(input)),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      form: init?.body instanceof URLSearchParams ? init.body : undefined,
    });

    const { status, body } = responses[index++];

    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { client: new HttpMetaSetupClient({ fetchFn: fetchFn as typeof fetch }), requests };
};

const path = (request: RecordedRequest) => request.url.pathname;

describe('HttpMetaSetupClient', () => {
  it('inspects a token with debug_token and maps the answer', async () => {
    const { client, requests } = stubFetch([
      {
        status: 200,
        body: {
          data: {
            app_id: '123',
            type: 'USER',
            is_valid: true,
            expires_at: 1790000000,
            scopes: ['pages_show_list', 'leads_retrieval'],
            granular_scopes: [
              { scope: 'pages_show_list', target_ids: ['111'] },
              { scope: 'leads_retrieval' },
            ],
          },
        },
      },
    ]);

    const info = await client.debugToken({ inputToken: 'user', accessToken: 'user' });

    expect(path(requests[0])).toBe('/v25.0/debug_token');
    expect(requests[0].url.searchParams.get('input_token')).toBe('user');
    expect(requests[0].headers.authorization).toBe('Bearer user');
    expect(info).toEqual({
      isValid: true,
      appId: '123',
      type: 'USER',
      expiresAt: 1790000000,
      scopes: ['pages_show_list', 'leads_retrieval'],
      granularScopes: [
        { scope: 'pages_show_list', targetIds: ['111'] },
        { scope: 'leads_retrieval', targetIds: [] },
      ],
    });
  });

  it('reports why debug_token found a token invalid', async () => {
    const { client } = stubFetch([
      {
        status: 200,
        body: {
          data: {
            is_valid: false,
            error: { message: 'Session has expired' },
            scopes: [],
          },
        },
      },
    ]);

    await expect(
      client.debugToken({ inputToken: 'user', accessToken: 'user' }),
    ).resolves.toMatchObject({ isValid: false, error: 'Session has expired' });
  });

  it('exchanges a user token for a long-lived one', async () => {
    const { client, requests } = stubFetch([
      { status: 200, body: { access_token: 'long-lived', token_type: 'bearer' } },
    ]);

    await expect(
      client.exchangeForLongLivedUserToken({
        appId: '123',
        appSecret: 'secret',
        userToken: 'short',
      }),
    ).resolves.toBe('long-lived');

    expect(path(requests[0])).toBe('/v25.0/oauth/access_token');
    expect(Object.fromEntries(requests[0].url.searchParams)).toEqual({
      grant_type: 'fb_exchange_token',
      client_id: '123',
      client_secret: 'secret',
      fb_exchange_token: 'short',
    });
  });

  it('lists managed Pages across result pages', async () => {
    const { client, requests } = stubFetch([
      {
        status: 200,
        body: {
          data: [{ id: '111', name: 'Acme', access_token: 'p1', tasks: ['MANAGE'] }],
          paging: { next: 'https://graph.facebook.com/v25.0/me/accounts?after=x' },
        },
      },
      { status: 200, body: { data: [{ id: '222', name: 'Beta', access_token: 'p2' }] } },
    ]);

    await expect(client.listManagedPages('long-lived')).resolves.toEqual([
      { id: '111', name: 'Acme', accessToken: 'p1', tasks: ['MANAGE'] },
      { id: '222', name: 'Beta', accessToken: 'p2', tasks: [] },
    ]);
    expect(path(requests[0])).toBe('/v25.0/me/accounts');
    expect(requests[0].url.searchParams.get('fields')).toBe('id,name,access_token,tasks');
    expect(requests[1].headers.authorization).toBe('Bearer long-lived');
  });

  it('registers the app webhook for Page leadgen with the app token', async () => {
    const { client, requests } = stubFetch([{ status: 200, body: { success: true } }]);

    await client.subscribeAppToPageWebhook({
      appId: '123',
      appAccessToken: '123|secret',
      callbackUrl: 'https://crm.example.com/s/meta/leadgen',
      verifyToken: 'verify',
    });

    expect(requests[0].method).toBe('POST');
    expect(path(requests[0])).toBe('/v25.0/123/subscriptions');
    expect(requests[0].headers.authorization).toBe('Bearer 123|secret');
    expect(Object.fromEntries(requests[0].form ?? [])).toEqual({
      object: 'page',
      callback_url: 'https://crm.example.com/s/meta/leadgen',
      verify_token: 'verify',
      fields: 'leadgen',
      include_values: 'true',
    });
  });

  it('subscribes the Page to leadgen with the Page token', async () => {
    const { client, requests } = stubFetch([{ status: 200, body: { success: true } }]);

    await client.subscribePageToLeadgen({ pageId: '111', pageAccessToken: 'page' });

    expect(requests[0].method).toBe('POST');
    expect(path(requests[0])).toBe('/v25.0/111/subscribed_apps');
    expect(requests[0].headers.authorization).toBe('Bearer page');
    expect(Object.fromEntries(requests[0].form ?? [])).toEqual({
      subscribed_fields: 'leadgen',
    });
  });

  it('throws when Meta answers success false', async () => {
    const { client } = stubFetch([{ status: 200, body: { success: false } }]);

    await expect(
      client.subscribePageToLeadgen({ pageId: '111', pageAccessToken: 'page' }),
    ).rejects.toThrow(MetaGraphError);
  });

  it('throws a MetaGraphError with the Graph error details', async () => {
    const { client } = stubFetch([
      {
        status: 400,
        body: { error: { message: 'Invalid OAuth access token', code: 190 } },
      },
    ]);

    await expect(client.listManagedPages('bad')).rejects.toMatchObject({
      code: 190,
      message: 'Invalid OAuth access token',
    });
  });
});
