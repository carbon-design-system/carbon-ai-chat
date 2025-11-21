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
import CarbonIconButtonElement from "@carbon/web-components/es/components/icon-button/icon-button.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const IconButton = withWebComponentBridge(
  createComponent({
    tagName: "cds-icon-button",
    elementClass: CarbonIconButtonElement,
    react: React,
  }),
);

export default IconButton;
