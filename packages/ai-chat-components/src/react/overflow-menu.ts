/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonOverflowMenuElement from "@carbon/web-components/es/components/overflow-menu/overflow-menu.js";
import CarbonOverflowMenuBodyElement from "@carbon/web-components/es/components/overflow-menu/overflow-menu-body.js";
import CarbonOverflowMenuItemElement from "@carbon/web-components/es/components/overflow-menu/overflow-menu-item.js";

const OverflowMenu = createComponent({
  tagName: "cds-overflow-menu",
  elementClass: CarbonOverflowMenuElement,
  react: React,
});

const OverflowMenuBody = createComponent({
  tagName: "cds-overflow-menu-body",
  elementClass: CarbonOverflowMenuBodyElement,
  react: React,
});

const OverflowMenuItem = createComponent({
  tagName: "cds-overflow-menu-item",
  elementClass: CarbonOverflowMenuItemElement,
  react: React,
});

export default OverflowMenu;
export { OverflowMenu, OverflowMenuBody, OverflowMenuItem };
