/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from "react";
import AIChatButton, { CHAT_BUTTON_KIND, CHAT_BUTTON_TYPE, CHAT_BUTTON_SIZE, CHAT_BUTTON_TOOLTIP_ALIGNMENT, CHAT_BUTTON_TOOLTIP_POSITION } from "../components/chat-button/src/chat-button.js";
declare const ChatButton: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<AIChatButton>>;
export default ChatButton;
export { CHAT_BUTTON_KIND, CHAT_BUTTON_TYPE, CHAT_BUTTON_SIZE, CHAT_BUTTON_TOOLTIP_ALIGNMENT, CHAT_BUTTON_TOOLTIP_POSITION, };
