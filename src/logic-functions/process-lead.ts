import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';
import { RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import { PROCESS_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/logic-function-universal-identifiers';
import { createMetaGraphClient } from 'src/meta-client/create-meta-graph-client';
import { MetaLeadStatus } from 'src/objects/meta-lead.object';
import { CoreApiLeadRepository } from 'src/twenty-client/core-api-lead-repository';
import { type LeadgenEvent } from 'src/utils/parse-leadgen-webhook';
import { processLead } from 'src/utils/process-lead';

const handler = async (event: LeadgenEvent) => {
  const result = await processLead({
    event,
    graph: createMetaGraphClient(),
    repository: new CoreApiLeadRepository(new CoreApiClient()),
  });

  if (result.status === MetaLeadStatus.FAILED && result.retryable) {
    throw new RetryableLogicFunctionError(result.error);
  }

  return result;
};

export default defineLogicFunction({
  universalIdentifier: PROCESS_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-process-lead',
  description:
    'Fetches one Meta lead, finds or creates the matching Person and stores the submission as a Meta Lead.',
  timeoutSeconds: 60,
  handler,
});
