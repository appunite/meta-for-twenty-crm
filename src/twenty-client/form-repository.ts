import { type MetaLeadFormQuestion } from 'src/meta-client/meta-graph-client';

export type SyncedForm = {
  formId: string;
  pageId: string;
  lastSyncedAt: string | null;
};

export type FormDetails = {
  formId: string;
  pageId: string;
  name: string;
  formStatus: string;
  locale?: string;
  questions: MetaLeadFormQuestion[];
  questionLabels: string;
  headline?: string;
  privacyPolicyUrl?: string;
  followUpActionUrl?: string;
  metaCreatedAt?: string;
  leadsCount?: number;
  organicLeadsCount?: number;
  expiredLeadsCount?: number;
};

// 'deleted': the form was deleted in Twenty and is left alone
export type UpsertFormResult = 'stored' | 'deleted';

export interface FormRepository {
  listEnabledForms(): Promise<SyncedForm[]>;
  upsertForm(form: FormDetails): Promise<UpsertFormResult>;
  setLastSyncedAt(formId: string, lastSyncedAt: string): Promise<void>;
}
