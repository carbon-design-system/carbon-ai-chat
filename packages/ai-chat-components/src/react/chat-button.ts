/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";
import {
  BUTTON_KIND,
  BUTTON_TYPE,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
} from "@carbon/web-components/es/components/button/defs.js";

// Export the actual class for the component that will *directly* be wrapped with React.
import AIChatButton from "../components/chat-button/chat-button.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const ChatButton = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-button",
    elementClass: AIChatButton,
    react: React,
  }),
);

export default ChatButton;
export {
  BUTTON_KIND,
  BUTTON_TYPE,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
};
