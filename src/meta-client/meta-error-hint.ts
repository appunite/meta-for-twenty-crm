import { MetaGraphError } from 'src/meta-client/http-meta-graph-client';

const isPermissionError = (code: number) =>
  code === 10 || (code >= 200 && code <= 299);

export const metaErrorHint = (error: unknown): string | undefined => {
  if (!(error instanceof MetaGraphError) || error.code === undefined) {
    return undefined;
  }

  if (error.code === 190) {
    return 'The page access token expired or was revoked. Generate a new one.';
  }

  if (error.code === 103) {
    return 'Meta blocked lead access. Assign your Meta app as a CRM in Leads Access.';
  }

  if (isPermissionError(error.code)) {
    return 'The page access token is missing a permission. See the setup guide for the list.';
  }

  if (error.code === 100 && error.subcode === 33) {
    return 'The Page ID is wrong or the token has no access to this Page.';
  }

  if (error.code === 100 && error.message.includes('nonexisting field')) {
    return 'This is not a Page, or the token is a user token. Use the id and access_token of your Page from me/accounts.';
  }

  return undefined;
};
