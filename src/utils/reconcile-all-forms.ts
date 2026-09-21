import { type MetaGraphClient } from 'src/meta-client/meta-graph-client';
import { type FormRepository } from 'src/twenty-client/form-repository';
import { type LeadRepository } from 'src/twenty-client/lead-repository';
import { reconcileFormLeads } from 'src/utils/reconcile-form-leads';

const OVERLAP_SECONDS = 60 * 60;
// Meta deletes lead data 90 days after submission
const RETENTION_WINDOW_SECONDS = 90 * 24 * 60 * 60;

export type ReconcileAllResult = {
  forms: number;
  processed: number;
  skipped: number;
  failed: number;
  failedForms: { formId: string; error: string }[];
};

const toUnixSeconds = (date: Date | string) =>
  Math.floor(new Date(date).getTime() / 1000);

export const reconcileAllForms = async ({
  formRepository,
  leadRepository,
  graph,
  now = new Date(),
  ignoreCursor = false,
}: {
  formRepository: FormRepository;
  leadRepository: LeadRepository;
  graph: Pick<MetaGraphClient, 'getLead' | 'listFormLeads'>;
  now?: Date;
  ignoreCursor?: boolean;
}): Promise<ReconcileAllResult> => {
  const forms = await formRepository.listEnabledForms();
  const windowStart = toUnixSeconds(now) - RETENTION_WINDOW_SECONDS;
  const result: ReconcileAllResult = {
    forms: forms.length,
    processed: 0,
    skipped: 0,
    failed: 0,
    failedForms: [],
  };

  for (const form of forms) {
    const cursor =
      !ignoreCursor && form.lastSyncedAt ? toUnixSeconds(form.lastSyncedAt) : null;
    const createdAfter =
      cursor === null ? windowStart : Math.max(windowStart, cursor - OVERLAP_SECONDS);

    try {
      const formResult = await reconcileFormLeads({
        pageId: form.pageId,
        formId: form.formId,
        createdAfter,
        graph,
        repository: leadRepository,
      });

      result.processed += formResult.processed;
      result.skipped += formResult.skipped;
      result.failed += formResult.failed;

      const previous = form.lastSyncedAt ? toUnixSeconds(form.lastSyncedAt) : 0;

      if (formResult.newestCreatedTime > Math.max(previous, createdAfter)) {
        await formRepository.setLastSyncedAt(
          form.formId,
          new Date(formResult.newestCreatedTime * 1000).toISOString(),
        );
      }
    } catch (error) {
      result.failedForms.push({
        formId: form.formId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
};
