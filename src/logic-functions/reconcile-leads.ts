import { defineLogicFunction } from 'twenty-sdk/define';

import { RECONCILE_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/logic-function-universal-identifiers';
import { runLeadSync } from 'src/logic-functions/run-lead-sync';

export default defineLogicFunction({
  universalIdentifier: RECONCILE_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-reconcile-leads',
  description:
    'Hourly safety net: syncs the Page forms and pulls recent leads that the webhook may have missed.',
  timeoutSeconds: 900,
  handler: () => runLeadSync({ ignoreCursor: false }),
  cronTriggerSettings: { pattern: '0 * * * *' },
});
