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

/**
 * Constructed class functionality for the chat header avatar.
 */
@carbonElement("cds-aichat-chat-header-avatar")
class CDSAIChatHeaderAvatarElement extends ChatHeaderAvatarElement {
  render() {
    return chatHeaderAvatarTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chat-header-avatar": CDSAIChatHeaderAvatarElement;
  }
}
export default CDSAIChatHeaderAvatarElement;
