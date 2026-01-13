import React from "react";
import CarbonContentSwitcherElement from "@carbon/web-components/es-custom/components/content-switcher/content-switcher.js";
import CarbonContentSwitcherItemElement from "@carbon/web-components/es-custom/components/content-switcher/content-switcher-item.js";
declare const ContentSwitcher: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonContentSwitcherElement>>;
declare const ContentSwitcherItem: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonContentSwitcherItemElement>>;
export default ContentSwitcher;
export { ContentSwitcher, ContentSwitcherItem };
