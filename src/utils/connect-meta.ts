import { MetaGraphError } from 'src/meta-client/graph-request';
import {
  type MetaManagedPage,
  type MetaSetupClient,
} from 'src/meta-client/meta-setup-client';
import { deriveVerifyToken } from 'src/utils/derive-verify-token';

export const REQUIRED_PERMISSIONS = [
  'pages_show_list',
  'leads_retrieval',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
  'ads_management',
];

export type ConnectStepId =
  | 'userToken'
  | 'longLivedToken'
  | 'page'
  | 'pageToken'
  | 'webhook'
  | 'pageSubscription';

export type ConnectStep = {
  id: ConnectStepId;
  label: string;
  status: 'ok' | 'warning' | 'failed';
  detail?: string;
};

export type ConnectResult = {
  steps: ConnectStep[];
  // Set when the token covers several Pages and none was chosen yet
  pages?: { id: string; name: string }[];
  connection?: { pageId: string; pageName: string; pageAccessToken: string };
};

const LABELS: Record<ConnectStepId, string> = {
  userToken: 'User token checked',
  longLivedToken: 'Exchanged for a long-lived token',
  page: 'Facebook Page found',
  pageToken: 'Page token never expires',
  webhook: 'Webhook registered in the Meta app',
  pageSubscription: 'Page sends leads to the app',
};

const step = (
  id: ConnectStepId,
  status: ConnectStep['status'],
  detail?: string,
): ConnectStep => ({ id, label: LABELS[id], status, ...(detail ? { detail } : {}) });

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const asSentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const isPermissionError = (error: unknown) =>
  error instanceof MetaGraphError &&
  error.code !== undefined &&
  (error.code === 10 || (error.code >= 200 && error.code <= 299));

type TokenCheck = { ok: true; appId: string } | { ok: false; detail: string };

const checkUserToken = async (
  graph: MetaSetupClient,
  userToken: string,
): Promise<TokenCheck> => {
  try {
    const info = await graph.debugToken({ inputToken: userToken, accessToken: userToken });

    if (!info.isValid) {
      return {
        ok: false,
        detail: `Meta says the token is not valid${info.error ? `: ${info.error}` : ''}. Generate a new one on developers.facebook.com/tools/explorer.`,
      };
    }

    if (info.type !== 'USER') {
      return {
        ok: false,
        detail: `This is a ${info.type || 'non-user'} token. Paste a User token instead: on developers.facebook.com/tools/explorer, keep User Token selected when you generate it.`,
      };
    }

    const missing = REQUIRED_PERMISSIONS.filter((scope) => !info.scopes.includes(scope));

    if (missing.length > 0) {
      return {
        ok: false,
        detail: `Missing permissions: ${missing.join(', ')}. Tick them on developers.facebook.com/tools/explorer and generate the token again.`,
      };
    }

    return { ok: true, appId: info.appId };
  } catch (error) {
    return {
      ok: false,
      detail: `Meta rejected the token: ${asSentence(errorMessage(error))} Generate a new one on developers.facebook.com/tools/explorer.`,
    };
  }
};

const pickPage = (
  pages: MetaManagedPage[],
  pageId: string | undefined,
): { page: MetaManagedPage } | { step: ConnectStep; choices?: MetaManagedPage[] } => {
  if (pages.length === 0) {
    return {
      step: step(
        'page',
        'failed',
        'The token gives access to no Page. Generate it again and tick your Page in the blue window.',
      ),
    };
  }

  if (pageId) {
    const page = pages.find((candidate) => candidate.id === pageId);

    return page
      ? { page }
      : { step: step('page', 'failed', `Page ${pageId} is not among the Pages this token can use.`) };
  }

  if (pages.length > 1) {
    return {
      step: step('page', 'warning', 'The token covers several Pages. Choose one.'),
      choices: pages,
    };
  }

  return { page: pages[0] };
};

const checkPageToken = async ({
  graph,
  page,
  appAccessToken,
}: {
  graph: MetaSetupClient;
  page: MetaManagedPage;
  appAccessToken: string;
}): Promise<ConnectStep> => {
  try {
    const info = await graph.debugToken({
      inputToken: page.accessToken,
      accessToken: appAccessToken,
    });

    if (!info.isValid || info.type !== 'PAGE') {
      return step('pageToken', 'failed', `Meta did not return a valid Page token${info.error ? `: ${info.error}` : ''}.`);
    }

    if (info.expiresAt !== 0) {
      return step(
        'pageToken',
        'warning',
        `The token expires on ${new Date(info.expiresAt * 1000).toISOString().slice(0, 10)}. Leads stop arriving then.`,
      );
    }

    return step('pageToken', 'ok');
  } catch (error) {
    return step('pageToken', 'failed', errorMessage(error));
  }
};

const registerWebhook = async ({
  graph,
  appId,
  appAccessToken,
  appSecret,
  callbackUrl,
}: {
  graph: MetaSetupClient;
  appId: string;
  appAccessToken: string;
  appSecret: string;
  callbackUrl: string;
}): Promise<ConnectStep> => {
  if (!callbackUrl.startsWith('https://')) {
    return step(
      'webhook',
      'failed',
      `Meta only accepts https addresses, and this Twenty is at ${callbackUrl}. Twenty has to be reachable over the internet.`,
    );
  }

  try {
    await graph.subscribeAppToPageWebhook({
      appId,
      appAccessToken,
      callbackUrl,
      verifyToken: deriveVerifyToken(appSecret),
    });

    return step('webhook', 'ok', callbackUrl);
  } catch (error) {
    return step(
      'webhook',
      'failed',
      `${asSentence(errorMessage(error))} Meta has to reach ${callbackUrl} from the internet.`,
    );
  }
};

const subscribePage = async (
  graph: MetaSetupClient,
  page: MetaManagedPage,
): Promise<ConnectStep> => {
  try {
    await graph.subscribePageToLeadgen({
      pageId: page.id,
      pageAccessToken: page.accessToken,
    });

    return step('pageSubscription', 'ok');
  } catch (error) {
    return step(
      'pageSubscription',
      'failed',
      isPermissionError(error)
        ? `${asSentence(errorMessage(error))} The token needs pages_manage_metadata.`
        : errorMessage(error),
    );
  }
};

export const connectMeta = async ({
  graph,
  appSecret,
  userToken: rawUserToken,
  pageId,
  callbackUrl,
}: {
  graph: MetaSetupClient;
  appSecret: string | undefined;
  userToken: string;
  pageId?: string;
  callbackUrl: string;
}): Promise<ConnectResult> => {
  const userToken = rawUserToken.trim();

  if (!appSecret) {
    return {
      steps: [
        step(
          'userToken',
          'failed',
          'Save the Meta app secret in the app settings first, then connect again.',
        ),
      ],
    };
  }

  if (!userToken) {
    return { steps: [step('userToken', 'failed', 'Paste a User token first.')] };
  }

  const tokenCheck = await checkUserToken(graph, userToken);

  if (!tokenCheck.ok) {
    return { steps: [step('userToken', 'failed', tokenCheck.detail)] };
  }

  const { appId } = tokenCheck;
  const steps: ConnectStep[] = [step('userToken', 'ok', `Meta app ${appId}`)];

  let longLivedToken: string;

  try {
    longLivedToken = await graph.exchangeForLongLivedUserToken({
      appId,
      appSecret,
      userToken,
    });
    steps.push(step('longLivedToken', 'ok'));
  } catch (error) {
    steps.push(
      step(
        'longLivedToken',
        'failed',
        `${asSentence(errorMessage(error))} Check that the Meta app secret in Settings belongs to the app you generated the token with.`,
      ),
    );

    return { steps };
  }

  let pages: MetaManagedPage[];

  try {
    pages = await graph.listManagedPages(longLivedToken);
  } catch (error) {
    steps.push(step('page', 'failed', errorMessage(error)));

    return { steps };
  }

  const picked = pickPage(pages, pageId?.trim() || undefined);

  if (!('page' in picked)) {
    steps.push(picked.step);

    return {
      steps,
      ...(picked.choices
        ? { pages: picked.choices.map(({ id, name }) => ({ id, name })) }
        : {}),
    };
  }

  const { page } = picked;
  const appAccessToken = `${appId}|${appSecret}`;

  steps.push(step('page', 'ok', `${page.name} (${page.id})`));

  const pageTokenStep = await checkPageToken({ graph, page, appAccessToken });

  steps.push(pageTokenStep);

  if (pageTokenStep.status === 'failed') {
    return { steps };
  }

  steps.push(
    await registerWebhook({ graph, appId, appAccessToken, appSecret, callbackUrl }),
    await subscribePage(graph, page),
  );

  return {
    steps,
    connection: { pageId: page.id, pageName: page.name, pageAccessToken: page.accessToken },
  };
};
