import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  META_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  META_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  PERSON_META_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/meta-lead-universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_META_LEADS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'metaLeads',
  label: 'Meta Leads',
  icon: 'IconBrandMeta',
  relationTargetObjectMetadataUniversalIdentifier:
    META_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    META_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.person,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
