/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { chatHeaderAvatarTemplate } from "./src/chatHeaderAvatar.template";
import { ChatHeaderAvatarElement } from "./src/chatHeaderAvatarElement";

const CHAT_HEADER_AVATAR_TAG_NAME = "cds-aichat-chat-header-avatar";

/**
 * Constructed class functionality for the chat header avatar.
 */
@carbonElement(CHAT_HEADER_AVATAR_TAG_NAME)
class CDSChatHeaderAvatarElement extends ChatHeaderAvatarElement {
  render() {
    return chatHeaderAvatarTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chat-header-avatar": CDSChatHeaderAvatarElement;
  }
}

export { CHAT_HEADER_AVATAR_TAG_NAME };
export default CDSChatHeaderAvatarElement;
