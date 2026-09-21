import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { META_LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/meta-lead-form-universal-identifiers';
import {
  LEAD_ADS_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  META_LEAD_FORMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: META_LEAD_FORMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Lead forms',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: META_LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: LEAD_ADS_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
