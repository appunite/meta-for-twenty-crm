import { describe, expect, it } from 'vitest';

import { type LeadgenEvent } from 'src/utils/parse-leadgen-webhook';
import { receiveLeadgenWebhook } from 'src/utils/receive-leadgen-webhook';

const APP_SECRET = 'test-app-secret';
const RAW_BODY =
  '{"object":"page","entry":[{"id":"111","time":1757846400,"changes":[{"field":"leadgen","value":{"leadgen_id":"444","page_id":"111","form_id":"222","created_time":1757846399}}]}]}';
// printf '%s' "$RAW_BODY" | openssl dgst -sha256 -hmac "$APP_SECRET"
const SIGNATURE =
  'sha256=46b2eec7ee43a56e2be309437757faccbc57c67bc1b012fd6869398833657100';

const recordingEnqueue = () => {
  const calls: LeadgenEvent[][] = [];

  return {
    calls,
    enqueue: async (events: LeadgenEvent[]) => {
      calls.push(events);
    },
  };
};

describe('receiveLeadgenWebhook', () => {
  it('queues the leadgen events of a correctly signed body', async () => {
    const { calls, enqueue } = recordingEnqueue();

    const result = await receiveLeadgenWebhook({
      rawBody: RAW_BODY,
      signatureHeader: SIGNATURE,
      appSecret: APP_SECRET,
      enqueue,
    });

    expect(result.status).toBe(200);
    expect(calls).toEqual([
      [
        {
          leadgenId: '444',
          pageId: '111',
          formId: '222',
          adId: undefined,
          createdTime: 1757846399,
        },
      ],
    ]);
  });

  it('refuses a bad signature and queues nothing', async () => {
    const { calls, enqueue } = recordingEnqueue();

    const result = await receiveLeadgenWebhook({
      rawBody: RAW_BODY,
      signatureHeader: `sha256=${'0'.repeat(64)}`,
      appSecret: APP_SECRET,
      enqueue,
    });

    expect(result.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('refuses when the app secret is not configured', async () => {
    const { calls, enqueue } = recordingEnqueue();

    const result = await receiveLeadgenWebhook({
      rawBody: RAW_BODY,
      signatureHeader: SIGNATURE,
      appSecret: undefined,
      enqueue,
    });

    expect(result.status).toBe(500);
    expect(calls).toEqual([]);
  });

  it('refuses when the raw body was not forwarded', async () => {
    const { calls, enqueue } = recordingEnqueue();

    const result = await receiveLeadgenWebhook({
      rawBody: undefined,
      signatureHeader: SIGNATURE,
      appSecret: APP_SECRET,
      enqueue,
    });

    expect(result.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it('accepts a signed body without leadgen changes and queues nothing', async () => {
    const { calls, enqueue } = recordingEnqueue();
    // same secret, body '{"object":"page","entry":[]}'
    const result = await receiveLeadgenWebhook({
      rawBody: '{"object":"page","entry":[]}',
      signatureHeader:
        'sha256=1a82db3abc2fa71a3fffecfedef579a8468a44850cd8a83a0c56974faff81689',
      appSecret: APP_SECRET,
      enqueue,
    });

    expect(result.status).toBe(200);
    expect(calls).toEqual([]);
  });
});
