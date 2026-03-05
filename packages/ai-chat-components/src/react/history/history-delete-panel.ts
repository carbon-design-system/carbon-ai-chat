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
import CDSAIChatHistoryDeletePanel from "../../components/chat-history/src/history-delete-panel.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryDeletePanel = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-delete-panel",
    elementClass: CDSAIChatHistoryDeletePanel,
    react: React,
    events: {
      onHistoryDeleteCancel: "history-delete-cancel",
      onHistoryDeleteConfirm: "history-delete-confirm",
    },
  }),
);

export default HistoryDeletePanel;
