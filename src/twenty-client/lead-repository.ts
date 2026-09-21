import { type MetaConsentResponse } from 'src/meta-client/meta-graph-client';
import { type MetaLeadPlatform, type MetaLeadStatus } from 'src/objects/meta-lead.object';
import { type MetaFieldData, type NormalizedLead } from 'src/utils/map-field-data-to-lead';

export type MetaLeadRecord = {
  name?: string;
  leadgenId: string;
  pageId: string;
  formId: string;
  formName?: string;
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  platform?: MetaLeadPlatform;
  isOrganic?: boolean;
  submittedAt?: string;
  fieldData?: MetaFieldData;
  consent?: MetaConsentResponse[];
  status: MetaLeadStatus;
  errorMessage?: string;
  personId?: string;
};

export interface LeadRepository {
  findMetaLeadStatus(leadgenId: string): Promise<MetaLeadStatus | null>;
  findFormName(formId: string): Promise<string | null>;
  findPersonIdByEmail(email: string): Promise<string | null>;
  findPersonIdByPhone(phone: string): Promise<string | null>;
  createPerson(lead: NormalizedLead): Promise<string>;
  upsertMetaLead(record: MetaLeadRecord): Promise<void>;
}
