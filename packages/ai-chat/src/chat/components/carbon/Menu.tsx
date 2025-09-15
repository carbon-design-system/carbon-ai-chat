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
import { MENU_SIZE } from "@carbon/web-components/es/components/menu/defs.js";
import CarbonMenuElement from "@carbon/web-components/es/components/menu/menu.js";
const Menu = createComponent({
  tagName: "cds-menu",
  elementClass: CarbonMenuElement,
  react: React,
});

export default Menu;
export { MENU_SIZE };
