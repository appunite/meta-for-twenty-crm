import { metaErrorHint } from 'src/meta-client/meta-error-hint';
import { type MetaGraphClient } from 'src/meta-client/meta-graph-client';

export type PageStatus =
  | {
      pageId: string;
      ok: true;
      name: string;
      isLeadgenSubscribed: boolean;
      formCount: number;
    }
  | { pageId: string; ok: false; error: string; hint?: string };

export type ConnectionStatus = {
  variables: {
    appSecret: boolean;
    verifyToken: boolean;
    pageAccessToken: boolean;
    pageId: boolean;
  };
  page: PageStatus | null;
};

export type ConnectionEnv = {
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
  META_PAGE_ACCESS_TOKEN?: string;
  META_PAGE_ID?: string;
};

type ConnectionGraph = Pick<
  MetaGraphClient,
  'getPage' | 'listSubscribedApps' | 'listPageForms'
>;

const checkPage = async (
  graph: ConnectionGraph,
  pageId: string,
): Promise<PageStatus> => {
  try {
    const page = await graph.getPage(pageId);
    const apps = await graph.listSubscribedApps(pageId);
    const forms = await graph.listPageForms(pageId);

    return {
      pageId,
      ok: true,
      name: page.name,
      isLeadgenSubscribed: apps.some((app) =>
        app.subscribedFields.includes('leadgen'),
      ),
      formCount: forms.length,
    };
  } catch (error) {
    const hint = metaErrorHint(error);

    return {
      pageId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ...(hint ? { hint } : {}),
    };
  }
};

export const checkConnection = async ({
  env,
  graph,
}: {
  env: ConnectionEnv;
  graph: ConnectionGraph;
}): Promise<ConnectionStatus> => {
  const pageId = (env.META_PAGE_ID ?? '').trim();
  const variables = {
    appSecret: Boolean(env.META_APP_SECRET),
    verifyToken: Boolean(env.META_VERIFY_TOKEN),
    pageAccessToken: Boolean(env.META_PAGE_ACCESS_TOKEN),
    pageId: pageId.length > 0,
  };

  if (!variables.pageAccessToken || !variables.pageId) {
    return { variables, page: null };
  }

  return { variables, page: await checkPage(graph, pageId) };
};
