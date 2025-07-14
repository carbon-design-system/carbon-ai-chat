/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html } from "lit";

import type { ChatHeaderTitleElement } from "../cds-aichat-chat-header-title";

/**
 * ChatHeaderTitleElement view logic.
 */
function chatHeaderTitleTemplate(customElementClass: ChatHeaderTitleElement) {
  const { title, name } = customElementClass;
  return html`<div class="WACChatHeaderTitle">
    <span className="WACChatHeaderTitle__Title" ?hidden="${!title}"
      >${title}</span
    >
    <span class="WACChatHeaderTitle__Name">${name}</span>
  </div>`;
}

export { chatHeaderTitleTemplate };
