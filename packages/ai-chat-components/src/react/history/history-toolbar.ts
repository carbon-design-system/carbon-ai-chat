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
import CDSAIChatHistoryToolbar from "../../components/chat-history/src/history-toolbar.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryToolbar = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-toolbar",
    elementClass: CDSAIChatHistoryToolbar,
    react: React,
    events: {
      onCdsSearchInput: "cds-search-input",
      onChatHistoryNewChatClick: "chat-history-new-chat-click",
    },
  }),
);

export default HistoryToolbar;
