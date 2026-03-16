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
import CDSAIChatHistoryPanelItem from "../../components/chat-history/src/history-panel-item.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryPanelItem = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-panel-item",
    elementClass: CDSAIChatHistoryPanelItem,
    react: React,
    events: {
      onMenuAction: "history-item-menu-action",
      onSelected: "history-item-selected",
      onRenameCancel: "history-panel-item-input-cancel",
      onRenameSave: "history-panel-item-input-save",
    },
  }),
);

export default HistoryPanelItem;
