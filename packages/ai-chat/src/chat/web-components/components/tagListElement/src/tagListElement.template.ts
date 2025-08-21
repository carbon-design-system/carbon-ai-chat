/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/tag/index.js";
import "@carbon/web-components/es-custom/components/chat-button/index.js";

import { html } from "lit";

import { CSS_CLASS_PREFIX } from "../../../settings";
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

  return html`<div class="${CSS_CLASS_PREFIX}-tag-list">
    ${html`<ul class="${CSS_CLASS_PREFIX}-tag-list-container">
      ${tags.map(
        (value) =>
          html`<li class="${CSS_CLASS_PREFIX}-tag-list-item}">
            <cds-custom-chat-button
              class="${CSS_CLASS_PREFIX}-tag-list-button"
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
            </cds-custom-chat-button>
          </li>`,
      )}
    </div>`}
  </div>`;
}

export { tagListElementTemplate };
