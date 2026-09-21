import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  META_LEAD_FORM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  META_LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/meta-lead-form-universal-identifiers';

const textField = (name: keyof typeof FIELD_IDS, label: string) => ({
  universalIdentifier: FIELD_IDS[name],
  name,
  label,
  type: FieldType.TEXT as const,
});

const countField = (name: keyof typeof FIELD_IDS, label: string) => ({
  universalIdentifier: FIELD_IDS[name],
  name,
  label,
  type: FieldType.NUMBER as const,
});

export default defineObject({
  universalIdentifier: META_LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'metaLeadForm',
  namePlural: 'metaLeadForms',
  labelSingular: 'Meta Lead Form',
  labelPlural: 'Meta Lead Forms',
  description: 'A Meta instant form and its sync settings',
  icon: 'IconForms',
  fields: [
    {
      universalIdentifier: FIELD_IDS.formId,
      name: 'formId',
      label: 'Form ID',
      type: FieldType.TEXT,
      icon: 'IconHash',
      isUnique: true,
    },
    {
      universalIdentifier: FIELD_IDS.pageId,
      name: 'pageId',
      label: 'Page ID',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: FIELD_IDS.isEnabled,
      name: 'isEnabled',
      label: 'Sync enabled',
      type: FieldType.BOOLEAN,
      defaultValue: true,
    },
    {
      universalIdentifier: FIELD_IDS.questionLabels,
      name: 'questionLabels',
      label: 'Questions',
      type: FieldType.TEXT,
      icon: 'IconHelpCircle',
    },
    {
      universalIdentifier: FIELD_IDS.questions,
      name: 'questions',
      label: 'Question details',
      type: FieldType.RAW_JSON,
    },
    textField('formStatus', 'Form status'),
    textField('locale', 'Locale'),
    textField('headline', 'Headline'),
    textField('privacyPolicyUrl', 'Privacy policy URL'),
    textField('followUpActionUrl', 'Follow-up URL'),
    countField('leadsCount', 'Leads in Meta'),
    countField('organicLeadsCount', 'Organic leads'),
    countField('expiredLeadsCount', 'Expired leads'),
    {
      universalIdentifier: FIELD_IDS.metaCreatedAt,
      name: 'metaCreatedAt',
      label: 'Created in Meta',
      type: FieldType.DATE_TIME,
      icon: 'IconCalendar',
    },
    {
      universalIdentifier: FIELD_IDS.fieldMapping,
      name: 'fieldMapping',
      label: 'Field mapping',
      type: FieldType.RAW_JSON,
    },
    {
      universalIdentifier: FIELD_IDS.lastSyncedAt,
      name: 'lastSyncedAt',
      label: 'Last synced at',
      type: FieldType.DATE_TIME,
      icon: 'IconRefresh',
    },
  ],
});
