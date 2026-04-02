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
import CDSAIChatHistoryContent from "../../components/chat-history/src/history-content.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryContent = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-content",
    elementClass: CDSAIChatHistoryContent,
    react: React,
  }),
);

export default HistoryContent;
