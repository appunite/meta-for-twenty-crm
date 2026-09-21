import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  META_WEBHOOK_PATH,
  WEBHOOK_VERIFY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/logic-function-universal-identifiers';
import { checkVerifyChallenge } from 'src/utils/check-verify-challenge';

const handler = (payload: RoutePayload) => {
  const { status, body } = checkVerifyChallenge({
    query: payload.queryStringParameters ?? {},
    verifyToken: process.env.META_VERIFY_TOKEN,
  });

  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain' },
  });
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_VERIFY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-webhook-verify',
  description: 'Answers the Meta webhook verification handshake.',
  timeoutSeconds: 10,
  handler,
  httpRouteTriggerSettings: {
    path: META_WEBHOOK_PATH,
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
