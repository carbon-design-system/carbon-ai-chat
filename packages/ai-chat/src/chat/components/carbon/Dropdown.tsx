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
import CarbonDropdownElement from "@carbon/web-components/es/components/dropdown/dropdown.js";
import CarbonDropdownItemElement from "@carbon/web-components/es/components/dropdown/dropdown-item.js";

const Dropdown = createComponent({
  tagName: "cds-dropdown",
  elementClass: CarbonDropdownElement,
  events: {
    onBeingSelected: "cds-dropdown-beingselected",
    onToggled: "cds-dropdown-toggled",
  },
  react: React,
});

const DropdownItem = createComponent({
  tagName: "cds-dropdown-item",
  elementClass: CarbonDropdownItemElement,
  react: React,
});

export { Dropdown, DropdownItem };

export default Dropdown;
