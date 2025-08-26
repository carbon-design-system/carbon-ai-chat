/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/layer/index.js";
import "@carbon/web-components/es/components/textarea/index.js";
import "../../tagListElement/cds-aichat-tag-list";

import cx from "classnames";
import { html, nothing } from "lit";

import { CSS_CLASS_PREFIX } from "../../../settings";
import { FeedbackElement } from "./FeedbackElement.js";
import { enLanguagePack } from "../../../../../types/instance/apiTypes";

// The maximum number of characters the user is allowed to type into the text area.
const MAX_TEXT_COUNT = 1000;

/**
 * Lit template for feedback.
 */
export function feedbackElementTemplate(customElementClass: FeedbackElement) {
  const {
    _handleCancel: handleCancel,
    _handleSubmit: handleSubmit,
    _handleTextInput: handleTextInput,
    _initialSelectedCategories: initialSelectedCategories,
    _textInput: textInput,
    _handleCategoryChange: handleCategoryChange,
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

  return html`<div
    class="${cx(`${CSS_CLASS_PREFIX}-container`, {
      [`${CSS_CLASS_PREFIX}-is-closed`]: !isOpen,
    })}"
  >
    <div class="${CSS_CLASS_PREFIX}-title-row">
      <div class="${CSS_CLASS_PREFIX}-title">
        ${title || enLanguagePack.feedback_defaultTitle}
      </div>
    </div>
    ${showPrompt
      ? html`<div class="${CSS_CLASS_PREFIX}-prompt">
          ${prompt || enLanguagePack.feedback_defaultPrompt}
        </div>`
      : ""}
    ${categories?.length
      ? html`<div class="${CSS_CLASS_PREFIX}-categories">
          <cds-aichat-tag-list
            .tags=${categories}
            .initialSelectedTags=${initialSelectedCategories}
            .onTagsChanged=${handleCategoryChange}
          >
          </cds-aichat-tag-list>
        </div>`
      : ""}
    ${showTextArea
      ? html`<div class="${CSS_CLASS_PREFIX}-feedback-text">
          <cds-textarea
            id="${id}-text-area"
            value="${textInput}"
            class="${CSS_CLASS_PREFIX}-feedback-text-area"
            ?disabled="${isReadonly}"
            placeholder="${placeholder ||
            enLanguagePack.feedback_defaultPlaceholder}"
            rows="3"
            max-count="${MAX_TEXT_COUNT}"
            @input=${handleTextInput}
          ></cds-textarea>
        </div>`
      : ""}
    ${disclaimer
      ? html`<div class="${CSS_CLASS_PREFIX}-disclaimer">
          <cds-aichat-markdown-text
            markdown="${disclaimer}"
          ></cds-aichat-markdown-text>
        </div>`
      : ""}
    <div class="${CSS_CLASS_PREFIX}-buttons">
      <cds-aichat-rounded-button
        class="${CSS_CLASS_PREFIX}-cancel"
        disabled=${isReadonly || nothing}
        size="lg"
        kind="secondary"
        @click=${handleCancel}
      >
        ${cancelLabel || enLanguagePack.feedback_cancelLabel}
      </cds-aichat-rounded-button>
      <cds-aichat-rounded-button
        class="${CSS_CLASS_PREFIX}-submit"
        disabled=${isReadonly || nothing}
        size="lg"
        @click=${handleSubmit}
      >
        ${submitLabel || enLanguagePack.feedback_submitLabel}
      </cds-aichat-rounded-button>
    </div>
  </div>`;
}
