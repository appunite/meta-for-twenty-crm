import { describe, expect, it } from 'vitest';

import {
  HttpMetaGraphClient,
  MetaGraphError,
} from 'src/meta-client/http-meta-graph-client';

type RecordedRequest = { url: URL; headers: Record<string, string> };

const stubFetch = (responses: { status: number; body: unknown }[]) => {
  const requests: RecordedRequest[] = [];
  let index = 0;

  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: new URL(String(input)),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });

    const { status, body } = responses[index++];

    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { fetchFn: fetchFn as typeof fetch, requests };
};

const GRAPH_LEAD = {
  id: '444444444444',
  created_time: '2026-09-14T08:49:14+0000',
  ad_id: '333333333333',
  ad_name: 'Autumn ad',
  adset_id: '555',
  adset_name: 'PL 25-45',
  campaign_id: '666',
  campaign_name: 'Autumn',
  form_id: '222222222222',
  field_data: [{ name: 'email', values: ['jane@example.com'] }],
  custom_disclaimer_responses: [
    { checkbox_key: 'marketing_optin', is_checked: '1' },
  ],
  is_organic: false,
  platform: 'ig',
};

describe('HttpMetaGraphClient', () => {
  it('fetches a lead by id with a bearer token and maps it', async () => {
    const { fetchFn, requests } = stubFetch([{ status: 200, body: GRAPH_LEAD }]);
    const client = new HttpMetaGraphClient({ accessToken: 'page-token', fetchFn });

    const lead = await client.getLead('444444444444');

    expect(requests).toHaveLength(1);
    expect(requests[0].url.origin + requests[0].url.pathname).toBe(
      'https://graph.facebook.com/v25.0/444444444444',
    );
    expect(requests[0].url.searchParams.get('fields')?.split(',')).toEqual(
      expect.arrayContaining([
        'field_data',
        'custom_disclaimer_responses',
        'campaign_name',
        'platform',
      ]),
    );
    expect(requests[0].url.searchParams.has('access_token')).toBe(false);
    expect(requests[0].headers.authorization).toBe('Bearer page-token');
    expect(lead).toEqual({
      id: '444444444444',
      createdTime: '2026-09-14T08:49:14+0000',
      formId: '222222222222',
      adId: '333333333333',
      adName: 'Autumn ad',
      adsetId: '555',
      adsetName: 'PL 25-45',
      campaignId: '666',
      campaignName: 'Autumn',
      isOrganic: false,
      platform: 'ig',
      fieldData: [{ name: 'email', values: ['jane@example.com'] }],
      consent: [{ checkbox_key: 'marketing_optin', is_checked: '1' }],
    });
  });

  it('maps an organic lead without ad fields or consent', async () => {
    const { fetchFn } = stubFetch([
      {
        status: 200,
        body: {
          id: '1',
          created_time: '2026-09-14T08:49:14+0000',
          form_id: '2',
          field_data: [],
          is_organic: true,
        },
      },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    expect(await client.getLead('1')).toEqual({
      id: '1',
      createdTime: '2026-09-14T08:49:14+0000',
      formId: '2',
      isOrganic: true,
      fieldData: [],
      consent: [],
    });
  });

  it('throws a MetaGraphError carrying the Graph error code', async () => {
    const { fetchFn } = stubFetch([
      {
        status: 403,
        body: {
          error: {
            message: 'CRM access has been revoked from Lead Access Manager',
            type: 'OAuthException',
            code: 103,
            fbtrace_id: 'abc',
          },
        },
      },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    const error = await client.getLead('1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MetaGraphError);
    expect(error).toMatchObject({
      message: 'CRM access has been revoked from Lead Access Manager',
      code: 103,
      status: 403,
    });
  });

  it('throws a MetaGraphError with the status when the body is not JSON', async () => {
    const fetchFn = (async () =>
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      })) as typeof fetch;
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    const error = await client.getLead('1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MetaGraphError);
    expect(error).toMatchObject({
      message: 'Graph API responded 502',
      code: undefined,
      status: 502,
    });
  });

  it('lists form leads newer than a timestamp across pages', async () => {
    const { fetchFn, requests } = stubFetch([
      {
        status: 200,
        body: {
          data: [{ ...GRAPH_LEAD, id: 'L1' }],
          paging: {
            next: 'https://graph.facebook.com/v25.0/222/leads?after=CURSOR',
          },
        },
      },
      { status: 200, body: { data: [{ ...GRAPH_LEAD, id: 'L2' }], paging: {} } },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    const leads = await client.listFormLeads({
      formId: '222',
      createdAfter: 1757846400,
    });

    expect(leads.map((lead) => lead.id)).toEqual(['L1', 'L2']);
    expect(requests[0].url.pathname).toBe('/v25.0/222/leads');
    expect(JSON.parse(requests[0].url.searchParams.get('filtering') ?? '')).toEqual([
      { field: 'time_created', operator: 'GREATER_THAN', value: 1757846400 },
    ]);
    expect(requests[1].url.searchParams.get('after')).toBe('CURSOR');
    expect(requests[1].headers.authorization).toBe('Bearer t');
  });

  it('lists the lead forms of a page with their questions and counts', async () => {
    const { fetchFn, requests } = stubFetch([
      {
        status: 200,
        body: {
          data: [
            {
              id: 'F1',
              name: 'Autumn form',
              status: 'ACTIVE',
              locale: 'pl_PL',
              questions: [
                { key: 'email', label: 'Email', type: 'EMAIL', id: '9' },
              ],
              question_page_custom_headline: 'Tell us about your project',
              privacy_policy_url: 'https://example.com/privacy',
              follow_up_action_url: 'https://example.com/thanks',
              created_time: '2026-09-15T12:40:29+0000',
              leads_count: 2,
              organic_leads_count: 1,
              expired_leads_count: 0,
            },
          ],
          paging: {},
        },
      },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    expect(await client.listPageForms('111')).toEqual([
      {
        id: 'F1',
        name: 'Autumn form',
        status: 'ACTIVE',
        locale: 'pl_PL',
        questions: [{ key: 'email', label: 'Email', type: 'EMAIL', id: '9' }],
        headline: 'Tell us about your project',
        privacyPolicyUrl: 'https://example.com/privacy',
        followUpActionUrl: 'https://example.com/thanks',
        createdTime: '2026-09-15T12:40:29+0000',
        leadsCount: 2,
        organicLeadsCount: 1,
        expiredLeadsCount: 0,
      },
    ]);
    expect(requests[0].url.pathname).toBe('/v25.0/111/leadgen_forms');
    expect(requests[0].url.searchParams.get('fields')?.split(',')).toEqual(
      expect.arrayContaining([
        'questions',
        'privacy_policy_url',
        'leads_count',
        'created_time',
      ]),
    );
  });

  it('lists a form without optional fields', async () => {
    const { fetchFn } = stubFetch([
      { status: 200, body: { data: [{ id: 'F2', name: 'Bare', status: 'DRAFT' }] } },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    expect(await client.listPageForms('111')).toEqual([
      { id: 'F2', name: 'Bare', status: 'DRAFT', questions: [] },
    ]);
  });

  it('reads the id and name of a page', async () => {
    const { fetchFn, requests } = stubFetch([
      { status: 200, body: { id: '111', name: 'Acme Studio' } },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    expect(await client.getPage('111')).toEqual({ id: '111', name: 'Acme Studio' });
    expect(requests[0].url.pathname).toBe('/v25.0/111');
    expect(requests[0].url.searchParams.get('fields')).toBe('id,name');
  });

  it('lists the apps subscribed to a page with their fields', async () => {
    const { fetchFn, requests } = stubFetch([
      {
        status: 200,
        body: {
          data: [
            {
              id: '999',
              name: 'Acme Leads',
              link: 'https://www.facebook.com/games/?app_id=999',
              subscribed_fields: ['leadgen', 'feed'],
            },
            { id: '998', name: 'Other app' },
          ],
        },
      },
    ]);
    const client = new HttpMetaGraphClient({ accessToken: 't', fetchFn });

    expect(await client.listSubscribedApps('111')).toEqual([
      { id: '999', name: 'Acme Leads', subscribedFields: ['leadgen', 'feed'] },
      { id: '998', name: 'Other app', subscribedFields: [] },
    ]);
    expect(requests[0].url.pathname).toBe('/v25.0/111/subscribed_apps');
  });
});
