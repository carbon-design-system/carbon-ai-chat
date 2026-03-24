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
import CDSAIChatHistoryLoading from "../../components/chat-history/src/history-loading.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryLoading = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-loading",
    elementClass: CDSAIChatHistoryLoading,
    react: React,
  }),
);

export default HistoryLoading;
