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

import { ChatHeaderLinkElement } from "../../../web-components/components/chatHeader/chatHeaderLink/cds-aichat-chat-header-link";
import { WEB_COMPONENT_PREFIX } from "../../../web-components/settings";

const ChatHeaderLink = createComponent({
  tagName: `${WEB_COMPONENT_PREFIX}-chat-header-link`,
  elementClass: ChatHeaderLinkElement,
  react: React,
});

export { ChatHeaderLink };
