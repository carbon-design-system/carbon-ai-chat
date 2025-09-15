/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";
import {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "@carbon/web-components/es/components/chat-button/chat-button.js";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonChatButtonElement from "@carbon/web-components/es/components/chat-button/chat-button.js";

const ChatButton = createComponent({
  tagName: "cds-chat-button",
  elementClass: CarbonChatButtonElement,
  react: React,
});

export default ChatButton;
export { CHAT_BUTTON_KIND, CHAT_BUTTON_SIZE };
