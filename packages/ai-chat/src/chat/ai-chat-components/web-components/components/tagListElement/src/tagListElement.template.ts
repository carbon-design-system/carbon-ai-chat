/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/chat-button/index.js";

import { html } from "lit";

import { prefix } from "../../../settings";
import TagListElement from "./TagListElement";

/**
 * Lit template for code.
 */
function tagListElementTemplate(customElementClass: TagListElement) {
  const {
    selectedTags,
    tags,
    _handleTagClick: handleTagClick,
  } = customElementClass;

  return html`<div class="${prefix}--tag-list">
    ${html`<ul class="${prefix}--tag-list-container">
      ${tags.map(
        (value) =>
          html`<li class="${prefix}--tag-list-item}">
            <cds-chat-button
              class="${prefix}--tag-list-button"
              kind="primary"
              size="sm"
              type="button"
              is-quick-action
              role="option"
              aria-pressed="${selectedTags.has(value)}"
              ?is-selected="${selectedTags.has(value)}"
              data-content="${value}"
              @click="${handleTagClick}"
            >
              ${value}
            </cds-chat-button>
          </li>`,
      )}
    </div>`}
  </div>`;
}

export { tagListElementTemplate };
