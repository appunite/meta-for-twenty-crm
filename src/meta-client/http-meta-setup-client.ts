import { graphRequest, graphUrl, MetaGraphError } from 'src/meta-client/graph-request';
import {
  type MetaManagedPage,
  type MetaSetupClient,
  type MetaTokenInfo,
} from 'src/meta-client/meta-setup-client';

type GraphDebugToken = {
  data: {
    app_id?: string;
    type?: string;
    is_valid?: boolean;
    expires_at?: number;
    scopes?: string[];
    granular_scopes?: { scope: string; target_ids?: string[] }[];
    error?: { message?: string };
  };
};

type GraphAccount = {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
};

type GraphPage<T> = { data: T[]; paging?: { next?: string } };

type GraphSuccess = { success?: boolean };

export class HttpMetaSetupClient implements MetaSetupClient {
  private readonly fetchFn: typeof fetch;

  constructor({ fetchFn = fetch }: { fetchFn?: typeof fetch } = {}) {
    this.fetchFn = fetchFn;
  }

  async debugToken({
    inputToken,
    accessToken,
  }: {
    inputToken: string;
    accessToken: string;
  }): Promise<MetaTokenInfo> {
    const { data } = await graphRequest<GraphDebugToken>({
      fetchFn: this.fetchFn,
      url: graphUrl('debug_token', { input_token: inputToken }),
      accessToken,
    });

    return {
      isValid: data.is_valid ?? false,
      appId: data.app_id ?? '',
      type: data.type ?? '',
      expiresAt: data.expires_at ?? 0,
      scopes: data.scopes ?? [],
      granularScopes: (data.granular_scopes ?? []).map((granular) => ({
        scope: granular.scope,
        targetIds: granular.target_ids ?? [],
      })),
      ...(data.error?.message ? { error: data.error.message } : {}),
    };
  }

  async exchangeForLongLivedUserToken({
    appId,
    appSecret,
    userToken,
  }: {
    appId: string;
    appSecret: string;
    userToken: string;
  }): Promise<string> {
    const { access_token } = await graphRequest<{ access_token: string }>({
      fetchFn: this.fetchFn,
      url: graphUrl('oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: userToken,
      }),
    });

    return access_token;
  }

  async listManagedPages(userToken: string): Promise<MetaManagedPage[]> {
    const pages: MetaManagedPage[] = [];
    let next: string | undefined = graphUrl('me/accounts', {
      fields: 'id,name,access_token,tasks',
      limit: '100',
    });

    while (next) {
      const page: GraphPage<GraphAccount> = await graphRequest<GraphPage<GraphAccount>>({
        fetchFn: this.fetchFn,
        url: next,
        accessToken: userToken,
      });

      pages.push(
        ...page.data.map((account) => ({
          id: account.id,
          name: account.name,
          accessToken: account.access_token,
          tasks: account.tasks ?? [],
        })),
      );
      next = page.paging?.next;
    }

    return pages;
  }

  async subscribeAppToPageWebhook({
    appId,
    appAccessToken,
    callbackUrl,
    verifyToken,
  }: {
    appId: string;
    appAccessToken: string;
    callbackUrl: string;
    verifyToken: string;
  }): Promise<void> {
    await this.post(`${appId}/subscriptions`, appAccessToken, {
      object: 'page',
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: 'leadgen',
      include_values: 'true',
    });
  }

  async subscribePageToLeadgen({
    pageId,
    pageAccessToken,
  }: {
    pageId: string;
    pageAccessToken: string;
  }): Promise<void> {
    await this.post(`${pageId}/subscribed_apps`, pageAccessToken, {
      subscribed_fields: 'leadgen',
    });
  }

  private async post(
    path: string,
    accessToken: string,
    form: Record<string, string>,
  ): Promise<void> {
    const result = await graphRequest<GraphSuccess>({
      fetchFn: this.fetchFn,
      url: graphUrl(path, {}),
      accessToken,
      form,
    });

    if (result.success !== true) {
      throw new MetaGraphError({ message: `Meta did not confirm ${path}`, status: 200 });
    }
  }
}
