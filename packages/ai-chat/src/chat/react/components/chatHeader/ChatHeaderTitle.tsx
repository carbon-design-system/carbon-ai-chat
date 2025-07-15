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

import { ChatHeaderTitleElement } from "../../../web-components/components/chatHeader/chatHeaderTitle/cds-aichat-chat-header-title";
import { WEB_COMPONENT_PREFIX } from "../../../web-components/settings";

const ChatHeaderTitle = createComponent({
  tagName: `${WEB_COMPONENT_PREFIX}-chat-header-title`,
  elementClass: ChatHeaderTitleElement,
  react: React,
});
export { ChatHeaderTitle };
