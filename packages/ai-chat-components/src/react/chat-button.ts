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

// Export the actual class for the component that will *directly* be wrapped with React.
import AIChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
} from "../components/chat-button/src/chat-button.js";
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
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
};
