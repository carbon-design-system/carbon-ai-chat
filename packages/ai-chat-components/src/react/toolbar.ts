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
import CDSAIChatToolbar from "../components/toolbar/src/toolbar.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const Toolbar = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-toolbar",
    elementClass: CDSAIChatToolbar,
    react: React,
  }),
);

export default Toolbar;
