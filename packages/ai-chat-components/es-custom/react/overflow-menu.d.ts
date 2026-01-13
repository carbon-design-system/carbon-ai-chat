import React from "react";
import CarbonOverflowMenuElement from "@carbon/web-components/es-custom/components/overflow-menu/overflow-menu.js";
import CarbonOverflowMenuBodyElement from "@carbon/web-components/es-custom/components/overflow-menu/overflow-menu-body.js";
import CarbonOverflowMenuItemElement from "@carbon/web-components/es-custom/components/overflow-menu/overflow-menu-item.js";
declare const OverflowMenu: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonOverflowMenuElement>>;
declare const OverflowMenuBody: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonOverflowMenuBodyElement>>;
declare const OverflowMenuItem: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonOverflowMenuItemElement>>;
export default OverflowMenu;
export { OverflowMenu, OverflowMenuBody, OverflowMenuItem };
