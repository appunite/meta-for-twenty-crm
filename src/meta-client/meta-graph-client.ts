import { type MetaFieldData } from 'src/utils/map-field-data-to-lead';

export type MetaConsentResponse = { checkbox_key: string; is_checked: string };

export type MetaLeadDetails = {
  id: string;
  createdTime: string;
  formId: string;
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  isOrganic: boolean;
  platform?: string;
  fieldData: MetaFieldData;
  consent: MetaConsentResponse[];
};

export type MetaLeadFormQuestion = {
  key: string;
  label: string;
  type: string;
  id?: string;
};

export type MetaLeadFormSummary = {
  id: string;
  name: string;
  status: string;
  locale?: string;
  questions: MetaLeadFormQuestion[];
  headline?: string;
  privacyPolicyUrl?: string;
  followUpActionUrl?: string;
  createdTime?: string;
  leadsCount?: number;
  organicLeadsCount?: number;
  expiredLeadsCount?: number;
};

export type MetaPage = { id: string; name: string };

export type MetaSubscribedApp = {
  id: string;
  name: string;
  subscribedFields: string[];
};

export interface MetaGraphClient {
  getLead(leadgenId: string): Promise<MetaLeadDetails>;
  listFormLeads(input: {
    formId: string;
    createdAfter: number;
  }): Promise<MetaLeadDetails[]>;
  listPageForms(pageId: string): Promise<MetaLeadFormSummary[]>;
  getPage(pageId: string): Promise<MetaPage>;
  listSubscribedApps(pageId: string): Promise<MetaSubscribedApp[]>;
}
