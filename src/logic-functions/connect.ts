import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  CONNECT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONNECT_PATH,
  META_WEBHOOK_PATH,
} from 'src/constants/logic-function-universal-identifiers';
import { HttpMetaSetupClient } from 'src/meta-client/http-meta-setup-client';
import { connectMeta } from 'src/utils/connect-meta';
import { resolveCallbackUrl } from 'src/utils/resolve-callback-url';

export type ConnectRequest = {
  userToken?: string;
  pageId?: string;
  // Overrides the address Twenty reports, e.g. a tunnel in front of a local server
  callbackUrl?: string;
};

const handler = (payload: RoutePayload<ConnectRequest>) => {
  const body = payload.body ?? {};

  return connectMeta({
    graph: new HttpMetaSetupClient(),
    appSecret: process.env.META_APP_SECRET,
    userToken: body.userToken ?? '',
    pageId: body.pageId,
    callbackUrl: resolveCallbackUrl({
      override: body.callbackUrl,
      defaultUrl: new RestApiClient().resolveUrl(`/s${META_WEBHOOK_PATH}`),
    }),
  });
};

export default defineLogicFunction({
  universalIdentifier: CONNECT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'meta-connect',
  description:
    'Turns a Meta User token into a never-expiring Page token, registers the webhook and subscribes the Page to leads. Saves nothing.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: CONNECT_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
