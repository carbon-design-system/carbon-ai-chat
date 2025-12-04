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

import CDSAIChatHeaderAvatarElement from "../../../web-components/components/chatHeader/chatHeaderAvatar/cds-aichat-chat-header-avatar";

const ChatHeaderAvatar = createComponent({
  tagName: "cds-aichat-chat-header-avatar",
  elementClass: CDSAIChatHeaderAvatarElement,
  react: React,
});

export { ChatHeaderAvatar };
