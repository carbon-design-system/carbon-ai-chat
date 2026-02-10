/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";
import CDSChatShellElement from "../components/chat-shell/src/shell.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const CdsAiChatShell = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-shell",
    elementClass: CDSChatShellElement,
    react: React,
  }),
);

export default CdsAiChatShell;
