import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { enqueueJobs, Response } from 'twenty-sdk/logic-function';

import {
  META_WEBHOOK_PATH,
  PROCESS_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  WEBHOOK_RECEIVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/logic-function-universal-identifiers';
import { type LeadgenEvent } from 'src/utils/parse-leadgen-webhook';
import { receiveLeadgenWebhook } from 'src/utils/receive-leadgen-webhook';

const enqueueProcessLead = async (events: LeadgenEvent[]) => {
  await enqueueJobs({
    logicFunctionUniversalIdentifier:
      PROCESS_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
    jobs: events.map((event) => ({ payload: event, jobId: event.leadgenId })),
  });
};

const handler = async (payload: RoutePayload) => {
  const { status, body } = await receiveLeadgenWebhook({
    rawBody: payload.rawBody,
    signatureHeader: payload.headers['x-hub-signature-256'],
    appSecret: process.env.META_APP_SECRET,
    enqueue: enqueueProcessLead,
  });

  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain' },
  });
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_RECEIVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-webhook-receive',
  description:
    'Receives Meta leadgen webhooks, checks the signature and queues each lead for processing.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: META_WEBHOOK_PATH,
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-hub-signature-256'],
  },
});
