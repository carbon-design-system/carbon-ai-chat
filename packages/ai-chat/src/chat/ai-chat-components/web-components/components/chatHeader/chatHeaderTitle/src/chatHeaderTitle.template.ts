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
  return html`<div class="cds-aichat--chat-header-title">
    <span className="cds-aichat--chat-header-title__title" ?hidden="${!title}"
      >${title}</span
    >
    <span class="cds-aichat--chat-header-title__name" ?hidden="${!name}"
      >${name}</span
    >
  </div>`;
}

export { chatHeaderTitleTemplate };
