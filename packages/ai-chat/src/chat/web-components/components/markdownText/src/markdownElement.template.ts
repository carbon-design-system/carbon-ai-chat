/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html } from "lit";

import MarkdownTextElement from "../cds-aichat-markdown-text";

function markdownTextTemplate(customElementClass: MarkdownTextElement) {
  const { renderedContent } = customElementClass;

  return html`<div class="cds-aichat-markdown-text">
    ${renderedContent || html``}
  </div>`;
}

export { markdownTextTemplate };
