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
import CDSAIChatHistoryPanelItemInput from "../../components/chat-history/src/history-panel-item-input.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryPanelItemInput = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-panel-item-input",
    elementClass: CDSAIChatHistoryPanelItemInput,
    react: React,
    events: {
      onInputCancel: "cds-aichat-history-panel-item-input-cancel",
      onInputSave: "cds-aichat-history-panel-item-input-save",
    },
  }),
);

export default HistoryPanelItemInput;
