import { isRetryableMetaError } from 'src/meta-client/is-retryable-meta-error';
import {
  type MetaGraphClient,
  type MetaLeadDetails,
} from 'src/meta-client/meta-graph-client';
import { MetaLeadPlatform, MetaLeadStatus } from 'src/objects/meta-lead.object';
import {
  type LeadRepository,
  type MetaLeadRecord,
} from 'src/twenty-client/lead-repository';
import {
  mapFieldDataToLead,
  type NormalizedLead,
} from 'src/utils/map-field-data-to-lead';
import { type LeadgenEvent } from 'src/utils/parse-leadgen-webhook';

export type ProcessLeadResult =
  | { status: MetaLeadStatus.PROCESSED; personId: string }
  | { status: MetaLeadStatus.SKIPPED }
  | { status: MetaLeadStatus.FAILED; error: string; retryable: boolean };

const PLATFORMS: Record<string, MetaLeadPlatform> = {
  fb: MetaLeadPlatform.FACEBOOK,
  ig: MetaLeadPlatform.INSTAGRAM,
};

const toPlatform = (platform: string | undefined) =>
  platform === undefined
    ? undefined
    : (PLATFORMS[platform] ?? MetaLeadPlatform.OTHER);

const toDisplayName = (lead: NormalizedLead, leadgenId: string) =>
  `${lead.firstName} ${lead.lastName}`.trim() || lead.email || leadgenId;

const findOrCreatePerson = async (
  repository: LeadRepository,
  lead: NormalizedLead,
): Promise<string> =>
  (lead.email && (await repository.findPersonIdByEmail(lead.email))) ||
  (lead.phone && (await repository.findPersonIdByPhone(lead.phone))) ||
  repository.createPerson(lead);

export const processLead = async ({
  event,
  graph,
  repository,
}: {
  event: LeadgenEvent;
  graph: Pick<MetaGraphClient, 'getLead'>;
  repository: LeadRepository;
}): Promise<ProcessLeadResult> => {
  const status = await repository.findMetaLeadStatus(event.leadgenId);

  if (status === MetaLeadStatus.PROCESSED) {
    return { status: MetaLeadStatus.SKIPPED };
  }

  const base = {
    leadgenId: event.leadgenId,
    pageId: event.pageId,
    formId: event.formId,
    adId: event.adId,
  };

  let details: MetaLeadDetails;

  try {
    details = await graph.getLead(event.leadgenId);
  } catch (error) {
    return recordFailure(repository, base, error);
  }

  try {
    const lead = mapFieldDataToLead(details.fieldData);
    const personId = await findOrCreatePerson(repository, lead);
    const formName = await repository.findFormName(event.formId);

    await repository.upsertMetaLead({
      ...base,
      name: toDisplayName(lead, event.leadgenId),
      formName: formName ?? undefined,
      adId: details.adId ?? event.adId,
      adName: details.adName,
      adsetId: details.adsetId,
      adsetName: details.adsetName,
      campaignId: details.campaignId,
      campaignName: details.campaignName,
      platform: toPlatform(details.platform),
      isOrganic: details.isOrganic,
      submittedAt: new Date(details.createdTime).toISOString(),
      fieldData: details.fieldData,
      consent: details.consent,
      status: MetaLeadStatus.PROCESSED,
      personId,
    });

    return { status: MetaLeadStatus.PROCESSED, personId };
  } catch (error) {
    return recordFailure(
      repository,
      { ...base, fieldData: details.fieldData, consent: details.consent },
      error,
    );
  }
};

const recordFailure = async (
  repository: LeadRepository,
  record: Omit<MetaLeadRecord, 'status'>,
  error: unknown,
): Promise<ProcessLeadResult> => {
  const message = error instanceof Error ? error.message : String(error);

  // A concurrent run (webhook job and reconcile) may have processed the lead meanwhile
  if (
    (await repository.findMetaLeadStatus(record.leadgenId)) ===
    MetaLeadStatus.PROCESSED
  ) {
    return { status: MetaLeadStatus.SKIPPED };
  }

  await repository.upsertMetaLead({
    ...record,
    status: MetaLeadStatus.FAILED,
    errorMessage: message,
  });

  return {
    status: MetaLeadStatus.FAILED,
    error: message,
    retryable: isRetryableMetaError(error),
  };
};
