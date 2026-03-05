/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";
import CDSAIChatHistoryPanel from "../../components/chat-history/src/history-panel.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryPanel = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-panel",
    elementClass: CDSAIChatHistoryPanel,
    react: React,
  }),
);

export default HistoryPanel;
