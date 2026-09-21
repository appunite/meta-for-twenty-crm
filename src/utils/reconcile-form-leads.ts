import {
  type MetaGraphClient,
  type MetaLeadDetails,
} from 'src/meta-client/meta-graph-client';
import { MetaLeadStatus } from 'src/objects/meta-lead.object';
import { type LeadRepository } from 'src/twenty-client/lead-repository';
import { processLead } from 'src/utils/process-lead';

export type ReconcileResult = {
  processed: number;
  skipped: number;
  failed: number;
  newestCreatedTime: number;
};

const toUnixSeconds = (isoTime: string) =>
  Math.floor(new Date(isoTime).getTime() / 1000);

export const reconcileFormLeads = async ({
  pageId,
  formId,
  createdAfter,
  graph,
  repository,
}: {
  pageId: string;
  formId: string;
  createdAfter: number;
  graph: Pick<MetaGraphClient, 'getLead' | 'listFormLeads'>;
  repository: LeadRepository;
}): Promise<ReconcileResult> => {
  const leads = await graph.listFormLeads({ formId, createdAfter });
  const listed = new Map<string, MetaLeadDetails>(
    leads.map((lead) => [lead.id, lead]),
  );
  const cachedGraph: Pick<MetaGraphClient, 'getLead'> = {
    getLead: async (leadgenId) => listed.get(leadgenId) ?? graph.getLead(leadgenId),
  };

  const result: ReconcileResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    newestCreatedTime: createdAfter,
  };

  for (const lead of leads) {
    const createdTime = toUnixSeconds(lead.createdTime);
    const outcome = await processLead({
      event: { leadgenId: lead.id, pageId, formId, adId: lead.adId, createdTime },
      graph: cachedGraph,
      repository,
    });

    if (outcome.status === MetaLeadStatus.PROCESSED) {
      result.processed++;
    } else if (outcome.status === MetaLeadStatus.SKIPPED) {
      result.skipped++;
    } else {
      result.failed++;
    }

    result.newestCreatedTime = Math.max(result.newestCreatedTime, createdTime);
  }

  return result;
};
