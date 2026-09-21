export type LeadgenEvent = {
  leadgenId: string;
  pageId: string;
  formId: string;
  adId?: string;
  createdTime: number;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const toLeadgenEvent = (change: unknown): LeadgenEvent[] => {
  if (!isRecord(change) || change.field !== 'leadgen') {
    return [];
  }

  const value = change.value;

  if (!isRecord(value) || typeof value.leadgen_id !== 'string') {
    return [];
  }

  return [
    {
      leadgenId: value.leadgen_id,
      pageId: String(value.page_id),
      formId: String(value.form_id),
      adId: typeof value.ad_id === 'string' ? value.ad_id : undefined,
      createdTime: Number(value.created_time),
    },
  ];
};

export const parseLeadgenWebhook = (body: unknown): LeadgenEvent[] => {
  if (!isRecord(body)) {
    return [];
  }

  return asArray(body.entry).flatMap((entry) =>
    isRecord(entry) ? asArray(entry.changes).flatMap(toLeadgenEvent) : [],
  );
};
