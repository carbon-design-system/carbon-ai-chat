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
import CDSAIChatHistoryPanelMenu from "../../components/chat-history/src/history-panel-menu.js";
import { withWebComponentBridge } from "../utils/withWebComponentBridge.js";

const HistoryPanelMenu = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-history-panel-menu",
    elementClass: CDSAIChatHistoryPanelMenu,
    react: React,
  }),
);

export default HistoryPanelMenu;
