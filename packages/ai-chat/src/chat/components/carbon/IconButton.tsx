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
export {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_TOOLTIP_ALIGNMENT,
} from "@carbon/web-components/es/components/icon-button/defs.js";
import CDSIconButtonElement from "@carbon/web-components/es/components/icon-button/icon-button.js";

const IconButton = createComponent({
  tagName: "cds-icon-button",
  elementClass: CDSIconButtonElement,
  react: React,
});

export default IconButton;
