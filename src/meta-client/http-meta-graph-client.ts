import {
  type MetaConsentResponse,
  type MetaGraphClient,
  type MetaLeadDetails,
  type MetaLeadFormQuestion,
  type MetaLeadFormSummary,
  type MetaPage,
  type MetaSubscribedApp,
} from 'src/meta-client/meta-graph-client';
import { type MetaFieldData } from 'src/utils/map-field-data-to-lead';

export const META_GRAPH_API_VERSION = 'v25.0';

const GRAPH_BASE_URL = 'https://graph.facebook.com';

const LEAD_FIELDS = [
  'id',
  'created_time',
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
  'form_id',
  'field_data',
  'custom_disclaimer_responses',
  'is_organic',
  'platform',
].join(',');

const FORM_FIELDS = [
  'id',
  'name',
  'status',
  'locale',
  'questions',
  'question_page_custom_headline',
  'privacy_policy_url',
  'follow_up_action_url',
  'created_time',
  'leads_count',
  'organic_leads_count',
  'expired_leads_count',
].join(',');

const PAGE_SIZE = '100';

type GraphLead = {
  id: string;
  created_time: string;
  form_id: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  field_data?: MetaFieldData;
  custom_disclaimer_responses?: MetaConsentResponse[];
  is_organic?: boolean;
  platform?: string;
};

type GraphSubscribedApp = { id: string; name: string; subscribed_fields?: string[] };

type GraphForm = {
  id: string;
  name: string;
  status: string;
  locale?: string;
  questions?: MetaLeadFormQuestion[];
  question_page_custom_headline?: string;
  privacy_policy_url?: string;
  follow_up_action_url?: string;
  created_time?: string;
  leads_count?: number;
  organic_leads_count?: number;
  expired_leads_count?: number;
};

type GraphPage<T> = { data: T[]; paging?: { next?: string } };

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number };
};

export class MetaGraphError extends Error {
  readonly code?: number;
  readonly subcode?: number;
  readonly status: number;

  constructor({
    message,
    code,
    subcode,
    status,
  }: {
    message: string;
    code?: number;
    subcode?: number;
    status: number;
  }) {
    super(message);
    this.name = 'MetaGraphError';
    this.code = code;
    this.subcode = subcode;
    this.status = status;
  }
}

const withoutUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;

const toLeadDetails = (lead: GraphLead): MetaLeadDetails =>
  withoutUndefined({
    id: lead.id,
    createdTime: lead.created_time,
    formId: lead.form_id,
    adId: lead.ad_id,
    adName: lead.ad_name,
    adsetId: lead.adset_id,
    adsetName: lead.adset_name,
    campaignId: lead.campaign_id,
    campaignName: lead.campaign_name,
    isOrganic: lead.is_organic ?? false,
    platform: lead.platform,
    fieldData: lead.field_data ?? [],
    consent: lead.custom_disclaimer_responses ?? [],
  });

const toFormSummary = (form: GraphForm): MetaLeadFormSummary =>
  withoutUndefined({
    id: form.id,
    name: form.name,
    status: form.status,
    locale: form.locale,
    questions: form.questions ?? [],
    headline: form.question_page_custom_headline,
    privacyPolicyUrl: form.privacy_policy_url,
    followUpActionUrl: form.follow_up_action_url,
    createdTime: form.created_time,
    leadsCount: form.leads_count,
    organicLeadsCount: form.organic_leads_count,
    expiredLeadsCount: form.expired_leads_count,
  });

export class HttpMetaGraphClient implements MetaGraphClient {
  private readonly accessToken: string;
  private readonly fetchFn: typeof fetch;

  constructor({
    accessToken,
    fetchFn = fetch,
  }: {
    accessToken: string;
    fetchFn?: typeof fetch;
  }) {
    this.accessToken = accessToken;
    this.fetchFn = fetchFn;
  }

  async getLead(leadgenId: string): Promise<MetaLeadDetails> {
    const lead = await this.get<GraphLead>(
      this.url(leadgenId, { fields: LEAD_FIELDS }),
    );

    return toLeadDetails(lead);
  }

  async listFormLeads({
    formId,
    createdAfter,
  }: {
    formId: string;
    createdAfter: number;
  }): Promise<MetaLeadDetails[]> {
    const leads = await this.getAllPages<GraphLead>(
      this.url(`${formId}/leads`, {
        fields: LEAD_FIELDS,
        filtering: JSON.stringify([
          { field: 'time_created', operator: 'GREATER_THAN', value: createdAfter },
        ]),
        limit: PAGE_SIZE,
      }),
    );

    return leads.map(toLeadDetails);
  }

  async listPageForms(pageId: string): Promise<MetaLeadFormSummary[]> {
    const forms = await this.getAllPages<GraphForm>(
      this.url(`${pageId}/leadgen_forms`, { fields: FORM_FIELDS, limit: PAGE_SIZE }),
    );

    return forms.map(toFormSummary);
  }

  async getPage(pageId: string): Promise<MetaPage> {
    const page = await this.get<MetaPage>(this.url(pageId, { fields: 'id,name' }));

    return { id: page.id, name: page.name };
  }

  async listSubscribedApps(pageId: string): Promise<MetaSubscribedApp[]> {
    const apps = await this.getAllPages<GraphSubscribedApp>(
      this.url(`${pageId}/subscribed_apps`, {}),
    );

    return apps.map((app) => ({
      id: app.id,
      name: app.name,
      subscribedFields: app.subscribed_fields ?? [],
    }));
  }

  private url(path: string, params: Record<string, string>): string {
    const url = new URL(`${GRAPH_BASE_URL}/${META_GRAPH_API_VERSION}/${path}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private async getAllPages<T>(firstUrl: string): Promise<T[]> {
    const items: T[] = [];
    let next: string | undefined = firstUrl;

    while (next) {
      const page: GraphPage<T> = await this.get<GraphPage<T>>(next);

      items.push(...page.data);
      next = page.paging?.next;
    }

    return items;
  }

  private async get<T>(url: string): Promise<T> {
    const response = await this.fetchFn(url, {
      headers: { authorization: `Bearer ${this.accessToken}` },
    });
    // Gateways in front of the Graph API can answer 5xx with an HTML page
    const body = (await response.json().catch(() => undefined)) as
      | (T & GraphErrorBody)
      | undefined;

    if (!response.ok || !body || body.error) {
      throw new MetaGraphError({
        message: body?.error?.message ?? `Graph API responded ${response.status}`,
        code: body?.error?.code,
        subcode: body?.error?.error_subcode,
        status: response.status,
      });
    }

    return body;
  }
}
