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
import CDSAIChatHistoryHeader from "../../components/chat-history/src/history-header.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryHeader = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-header",
    elementClass: CDSAIChatHistoryHeader,
    react: React,
    events: {
      onHistoryHeaderCloseClick: "history-header-close-click",
    },
  }),
);

export default HistoryHeader;
