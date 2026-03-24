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
import CDSAIChatHistoryPanelItems from "../../components/chat-history/src/history-panel-items.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryPanelItems = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-panel-items",
    elementClass: CDSAIChatHistoryPanelItems,
    react: React,
  }),
);

export default HistoryPanelItems;
