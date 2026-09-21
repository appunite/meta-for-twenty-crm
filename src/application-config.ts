import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  META_APP_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
  META_PAGE_ACCESS_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
  META_PAGE_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
  META_VERIFY_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/logic-function-universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    META_APP_SECRET: {
      universalIdentifier: META_APP_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Meta app secret',
      description:
        'App secret of your Meta app (App settings > Basic). Used to verify webhook signatures.',
      isSecret: true,
    },
    META_VERIFY_TOKEN: {
      universalIdentifier: META_VERIFY_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Webhook verify token',
      description:
        'Any random string. Paste the same value as the verify token in the Meta app webhook settings.',
      isSecret: true,
    },
    META_PAGE_ACCESS_TOKEN: {
      universalIdentifier: META_PAGE_ACCESS_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Page access token',
      description:
        'System user or long-lived Page access token with leads_retrieval.',
      isSecret: true,
    },
    META_PAGE_ID: {
      universalIdentifier: META_PAGE_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Facebook Page ID',
      description:
        'ID of the Facebook Page whose lead forms should be synced. One Page per workspace.',
      value: '',
    },
  },
});
