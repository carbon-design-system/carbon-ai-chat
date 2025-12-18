/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../../markdown/index.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/chat-button/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/layer/index.js";
import "@carbon/web-components/es/components/textarea/index.js";

import { html } from "lit";

import prefix from "../../../globals/settings.js";
import { CDSAIChatFeedback } from "./feedback.js";

// The maximum number of characters the user is allowed to type into the text area.
const MAX_TEXT_COUNT = 1000;

/**
 * Lit template for feedback.
 */
function feedbackElementTemplate(customElementClass: CDSAIChatFeedback) {
  const {
    _handleCancel: handleCancel,
    _handleSubmit: handleSubmit,
    _handleTextInput: handleTextInput,
    _textInput: textInput,
    _selectedCategories: selectedCategories,
    _handleCategoryClick: handleCategoryClick,
    id,
    isReadonly,
    isOpen,
    title,
    prompt,
    placeholder,
    categories,
    disclaimer,
    showTextArea,
    showPrompt,
    submitLabel,
    cancelLabel,
  } = customElementClass;

  const containerClasses = [`${prefix}--container`];
  if (!isOpen) {
    containerClasses.push(`${prefix}--is-closed`);
  }

  return html`<div class="${containerClasses.join(" ")}">
    <div class="${prefix}--title-row">
      <div class="${prefix}--title">
        ${title || "Provide additional feedback"}
      </div>
    </div>
    ${showPrompt
      ? html`<div class="${prefix}--prompt">
          ${prompt || "What do you think of this response?"}
        </div>`
      : ""}
    ${categories?.length
      ? html`<div class="${prefix}--categories">
          <ul class="${prefix}--tag-list-container" role="listbox">
            ${categories.map(
              (value) =>
                html`<li class="${prefix}--tag-list-item">
                  <cds-chat-button
                    class="${prefix}--tag-list-button"
                    kind="primary"
                    size="sm"
                    type="button"
                    is-quick-action
                    role="option"
                    aria-pressed="${selectedCategories.has(value)}"
                    ?is-selected=${selectedCategories.has(value)}
                    data-content="${value}"
                    ?disabled=${isReadonly}
                    @click=${handleCategoryClick}
                  >
                    ${value}
                  </cds-chat-button>
                </li>`,
            )}
          </ul>
        </div>`
      : ""}
    ${showTextArea
      ? html`<div class="${prefix}--feedback-text">
          <cds-textarea
            id="${id}-text-area"
            value="${textInput}"
            class="${prefix}--feedback-text-area"
            ?disabled=${isReadonly}
            placeholder="${placeholder || "Provide additional feedback..."}"
            rows="3"
            max-count="${MAX_TEXT_COUNT}"
            @input=${handleTextInput}
          ></cds-textarea>
        </div>`
      : ""}
    ${disclaimer
      ? html`<div class="${prefix}--disclaimer">
          <cds-aichat-markdown>${disclaimer}</cds-aichat-markdown>
        </div>`
      : ""}
    <div class="${prefix}--buttons">
      <div class="${prefix}--cancel" data-rounded="bottom-left">
        <cds-button
          ?disabled=${isReadonly}
          size="lg"
          kind="secondary"
          @click=${handleCancel}
        >
          ${cancelLabel || "Cancel"}
        </cds-button>
      </div>
      <div class="${prefix}--submit" data-rounded="bottom-right">
        <cds-button
          ?disabled=${isReadonly}
          size="lg"
          kind="primary"
          @click=${handleSubmit}
        >
          ${submitLabel || "Submit"}
        </cds-button>
      </div>
    </div>
  </div>`;
}

export { feedbackElementTemplate };
