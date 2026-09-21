import { defineLogicFunction } from 'twenty-sdk/define';

import {
  CONNECTION_STATUS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONNECTION_STATUS_PATH,
} from 'src/constants/logic-function-universal-identifiers';
import { createMetaGraphClient } from 'src/meta-client/create-meta-graph-client';
import { checkConnection } from 'src/utils/check-connection';

const handler = () =>
  checkConnection({ env: process.env, graph: createMetaGraphClient() });

export default defineLogicFunction({
  universalIdentifier: CONNECTION_STATUS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-connection-status',
  description:
    'Reports which settings are filled in and whether each Facebook Page is reachable and subscribed to leads.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: CONNECTION_STATUS_PATH,
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
