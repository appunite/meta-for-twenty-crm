import { defineLogicFunction } from 'twenty-sdk/define';

import { BACKFILL_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/logic-function-universal-identifiers';
import { runLeadSync } from 'src/logic-functions/run-lead-sync';

export default defineLogicFunction({
  universalIdentifier: BACKFILL_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-backfill-leads',
  description:
    'Syncs the Page forms and imports every lead Meta still keeps (last 90 days).',
  timeoutSeconds: 900,
  handler: () => runLeadSync({ ignoreCursor: true }),
});
