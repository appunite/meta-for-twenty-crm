import {
  defineObject,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  META_LEAD_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  META_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  PERSON_META_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/meta-lead-universal-identifiers';

export enum MetaLeadStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum MetaLeadPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  OTHER = 'OTHER',
}

const textField = (name: keyof typeof FIELD_IDS, label: string) => ({
  universalIdentifier: FIELD_IDS[name],
  name,
  label,
  type: FieldType.TEXT as const,
});

export default defineObject({
  universalIdentifier: META_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'metaLead',
  namePlural: 'metaLeads',
  labelSingular: 'Meta Lead',
  labelPlural: 'Meta Leads',
  description: 'One Meta Lead Ads form submission',
  icon: 'IconBrandMeta',
  fields: [
    {
      ...textField('leadgenId', 'Leadgen ID'),
      icon: 'IconHash',
      isUnique: true,
    },
    textField('pageId', 'Page ID'),
    textField('formId', 'Form ID'),
    textField('formName', 'Form'),
    textField('adId', 'Ad ID'),
    textField('adName', 'Ad'),
    textField('adsetId', 'Ad set ID'),
    textField('adsetName', 'Ad set'),
    textField('campaignId', 'Campaign ID'),
    textField('campaignName', 'Campaign'),
    {
      universalIdentifier: FIELD_IDS.platform,
      name: 'platform',
      label: 'Platform',
      type: FieldType.SELECT,
      icon: 'IconDevices',
      options: [
        { value: MetaLeadPlatform.FACEBOOK, label: 'Facebook', position: 0, color: 'blue' },
        { value: MetaLeadPlatform.INSTAGRAM, label: 'Instagram', position: 1, color: 'pink' },
        { value: MetaLeadPlatform.OTHER, label: 'Other', position: 2, color: 'gray' },
      ],
    },
    {
      universalIdentifier: FIELD_IDS.isOrganic,
      name: 'isOrganic',
      label: 'Organic',
      type: FieldType.BOOLEAN,
      defaultValue: false,
    },
    {
      universalIdentifier: FIELD_IDS.isTest,
      name: 'isTest',
      label: 'Test lead',
      type: FieldType.BOOLEAN,
      defaultValue: false,
    },
    {
      universalIdentifier: FIELD_IDS.submittedAt,
      name: 'submittedAt',
      label: 'Submitted at',
      type: FieldType.DATE_TIME,
      icon: 'IconCalendar',
    },
    {
      universalIdentifier: FIELD_IDS.fieldData,
      name: 'fieldData',
      label: 'Answers',
      type: FieldType.RAW_JSON,
    },
    {
      universalIdentifier: FIELD_IDS.consent,
      name: 'consent',
      label: 'Consent',
      type: FieldType.RAW_JSON,
    },
    {
      universalIdentifier: FIELD_IDS.status,
      name: 'status',
      label: 'Status',
      type: FieldType.SELECT,
      icon: 'IconProgressCheck',
      defaultValue: `'${MetaLeadStatus.RECEIVED}'`,
      options: [
        { value: MetaLeadStatus.RECEIVED, label: 'Received', position: 0, color: 'gray' },
        { value: MetaLeadStatus.PROCESSED, label: 'Processed', position: 1, color: 'green' },
        { value: MetaLeadStatus.FAILED, label: 'Failed', position: 2, color: 'red' },
        { value: MetaLeadStatus.SKIPPED, label: 'Skipped', position: 3, color: 'orange' },
      ],
    },
    textField('errorMessage', 'Error'),
    {
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Person',
      type: FieldType.RELATION,
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        PERSON_META_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.SET_NULL,
        joinColumnName: 'personId',
      },
    },
  ],
});
