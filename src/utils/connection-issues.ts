import { type ConnectionStatus, type PageStatus } from 'src/utils/check-connection';

const MISSING_VARIABLE_ISSUES: [keyof ConnectionStatus['variables'], string][] = [
  ['appSecret', 'Fill in the Meta app secret.'],
  ['verifyToken', 'Fill in the webhook verify token.'],
  ['pageAccessToken', 'Fill in the page access token.'],
  ['pageId', 'Fill in the Facebook Page ID.'],
];

const pageIssues = (page: PageStatus): string[] => {
  if (!page.ok) {
    return [`Page ${page.pageId}: ${page.hint ?? page.error}`];
  }

  return [
    ...(page.isLeadgenSubscribed
      ? []
      : [`${page.name} is not subscribed to lead notifications. See setup step 9.`]),
    ...(page.formCount > 0 ? [] : [`${page.name} has no lead forms yet.`]),
  ];
};

export const connectionIssues = (status: ConnectionStatus): string[] => [
  ...MISSING_VARIABLE_ISSUES.filter(([key]) => !status.variables[key]).map(
    ([, issue]) => issue,
  ),
  ...(status.page ? pageIssues(status.page) : []),
];
