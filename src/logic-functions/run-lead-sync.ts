import { CoreApiClient } from 'twenty-client-sdk/core';

import { createMetaGraphClient } from 'src/meta-client/create-meta-graph-client';
import { CoreApiFormRepository } from 'src/twenty-client/core-api-form-repository';
import { CoreApiLeadRepository } from 'src/twenty-client/core-api-lead-repository';
import { reconcileAllForms } from 'src/utils/reconcile-all-forms';
import { syncPageForms } from 'src/utils/sync-page-forms';

export const runLeadSync = async ({ ignoreCursor }: { ignoreCursor: boolean }) => {
  const client = new CoreApiClient();
  const graph = createMetaGraphClient();
  const formRepository = new CoreApiFormRepository(client);

  let formsSynced = 0;
  let formSyncError: string | undefined;

  try {
    formsSynced = await syncPageForms({
      pageId: process.env.META_PAGE_ID ?? '',
      graph,
      formRepository,
    });
  } catch (error) {
    formSyncError = error instanceof Error ? error.message : String(error);
  }

  const result = await reconcileAllForms({
    formRepository,
    leadRepository: new CoreApiLeadRepository(client),
    graph,
    ignoreCursor,
  });

  return { formsSynced, formSyncError, ...result };
};
