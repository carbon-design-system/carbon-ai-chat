/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/button/index.js";
import "@carbon/web-components/es-custom/components/overflow-menu/index.js";

import { html } from "lit";

import type { ChatHeaderLinkElement } from "../cds-aichat-chat-header-link";
import { ButtonKindEnum } from "../../../../../../types/utilities/carbonTypes";

/**
 * ChatHeaderLinkElement view logic.
 */
function chatHeaderLinkTemplate(customElementClass: ChatHeaderLinkElement) {
  const { label, url, isNewTab } = customElementClass;
  return html`<cds-custom-button
    class="WACChatHeaderLink"
    href="${url}"
    target="${isNewTab ? "_blank" : "_self"}"
    kind="${ButtonKindEnum.GHOST}"
    size="md"
    >${label}</cds-custom-button
  >`;
}

export { chatHeaderLinkTemplate };
