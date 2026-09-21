import { HttpMetaGraphClient } from 'src/meta-client/http-meta-graph-client';
import { type MetaGraphClient } from 'src/meta-client/meta-graph-client';

const notConfigured = async (): Promise<never> => {
  throw new Error('META_PAGE_ACCESS_TOKEN is not configured');
};

export const createMetaGraphClient = (): MetaGraphClient => {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      getLead: notConfigured,
      listFormLeads: notConfigured,
      listPageForms: notConfigured,
      getPage: notConfigured,
      listSubscribedApps: notConfigured,
    };
  }

  return new HttpMetaGraphClient({ accessToken });
};
