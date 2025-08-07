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
import {
  BUTTON_KIND,
  BUTTON_TYPE,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/defs.js";
// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonButtonElement from "@carbon/web-components/es-custom/components/button/button.js";

const Button = createComponent({
  tagName: "cds-custom-button",
  elementClass: CarbonButtonElement,
  react: React,
});

export default Button;
export { BUTTON_KIND, BUTTON_TYPE, BUTTON_SIZE };
