import {
  type LeadgenEvent,
  parseLeadgenWebhook,
} from 'src/utils/parse-leadgen-webhook';
import { verifyMetaSignature } from 'src/utils/verify-meta-signature';

export type ReceiveResult = { status: 200 | 400 | 401 | 500; body: string };

export const receiveLeadgenWebhook = async ({
  rawBody,
  signatureHeader,
  appSecret,
  enqueue,
}: {
  rawBody: string | undefined;
  signatureHeader: string | undefined;
  appSecret: string | undefined;
  enqueue: (events: LeadgenEvent[]) => Promise<void>;
}): Promise<ReceiveResult> => {
  if (!appSecret) {
    return { status: 500, body: 'META_APP_SECRET is not configured' };
  }

  if (rawBody === undefined) {
    return { status: 400, body: 'Raw body was not forwarded' };
  }

  const signature = verifyMetaSignature({ rawBody, signatureHeader, appSecret });

  if (!signature.valid) {
    return { status: 401, body: signature.error };
  }

  const events = parseLeadgenWebhook(JSON.parse(rawBody));

  if (events.length > 0) {
    await enqueue(events);
  }

  return { status: 200, body: `Queued ${events.length}` };
};
