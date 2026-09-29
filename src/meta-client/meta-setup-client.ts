export type MetaTokenInfo = {
  isValid: boolean;
  appId: string;
  type: string;
  // 0 means the token never expires
  expiresAt: number;
  scopes: string[];
  granularScopes: { scope: string; targetIds: string[] }[];
  error?: string;
};

export type MetaManagedPage = {
  id: string;
  name: string;
  accessToken: string;
  tasks: string[];
};

export interface MetaSetupClient {
  debugToken(input: { inputToken: string; accessToken: string }): Promise<MetaTokenInfo>;
  exchangeForLongLivedUserToken(input: {
    appId: string;
    appSecret: string;
    userToken: string;
  }): Promise<string>;
  listManagedPages(userToken: string): Promise<MetaManagedPage[]>;
  subscribeAppToPageWebhook(input: {
    appId: string;
    appAccessToken: string;
    callbackUrl: string;
    verifyToken: string;
  }): Promise<void>;
  subscribePageToLeadgen(input: {
    pageId: string;
    pageAccessToken: string;
  }): Promise<void>;
}
