/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";

import CDSAIChatLauncher from "../components/launcher/src/launcher.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const Launcher = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-launcher",
    elementClass: CDSAIChatLauncher,
    react: React,
    events: {
      onToggle: "cds-aichat-launcher-toggle",
    },
  }),
);

export default Launcher;
