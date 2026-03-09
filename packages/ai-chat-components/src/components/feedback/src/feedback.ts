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

import { html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./feedback.scss?lit";

// The maximum number of characters the user is allowed to type into the text area.
const MAX_TEXT_COUNT = 1000;

/**
 * The component for displaying a panel requesting feedback from a user.
 * @element cds-aichat-feedback
 */
@carbonElement(`${prefix}-feedback`)
class CDSAIChatFeedback extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * The CSS class of this panel.
   */
  @property({ type: String, attribute: "class", reflect: true })
  class!: string;

  /**
   * The ID of this panel.
   */
  @property({ type: String, attribute: "id", reflect: true })
  id!: string;

  /**
   * Indicates if the feedback details are open.
   */
  @property({ type: Boolean, attribute: "is-open", reflect: true })
  isOpen = false;

  /**
   * Indicates if the feedback details are readonly.
   */
  @property({ type: Boolean, attribute: "is-readonly", reflect: true })
  isReadonly = false;

  /**
   * The initial values to display in the feedback.
   */
  @property({ type: Object, attribute: "initial-values", reflect: true })
  initialValues?: FeedbackInitialValues;

  /**
   * The title to display in the popup. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "title", reflect: true })
  title = "";

  /**
   * The prompt text to display to the user. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "prompt", reflect: true })
  prompt = "";

  /**
   * The list of categories to show.
   */
  @property({ type: Array, attribute: "categories", reflect: true })
  categories?: string[];

  /**
   * The legal disclaimer text to show at the bottom of the popup. This text may contain rich markdown content. If this
   * value is not provided, no text will be shown.
   */
  @property({ type: String, attribute: "disclaimer", reflect: true })
  disclaimer?: string;

  /**
   * The placeholder to show in the text area. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "text-area-placeholder", reflect: true })
  placeholder?: string;

  /**
   * The label for the cancel button. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "cancel-label", reflect: true })
  cancelLabel?: string;

  /**
   * The label for the submit button. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "submit-label", reflect: true })
  submitLabel?: string;

  /**
   * The accessible label for the categories listbox. This label is used by screen readers to describe the purpose of the category selection list.
   */
  @property({ type: String, attribute: "categories-label", reflect: true })
  categoriesLabel?: string;

  /**
   * Indicates whether the text area should be shown.
   */
  @property({ type: Boolean, attribute: "show-text-area", reflect: true })
  showTextArea = true;

  /**
   * Indicates whether the prompt line should be shown.
   */
  @property({ type: Boolean, attribute: "show-prompt", reflect: true })
  showPrompt = true;

  /**
   * Internal saved text values for feedback.
   *
   * @internal
   */
  @state()
  _textInput = "";

  /**
   * The current set of selected categories.
   *
   * @internal
   */
  @state()
  _selectedCategories: Set<string> = new Set();

  /**
   * Called when the properties of the component have changed.
   */
  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("initialValues")) {
      this._setInitialValues(this.initialValues);
    }
  }

  /**
   * Updates the initial values used in the component.
   */
  protected _setInitialValues(values?: FeedbackInitialValues) {
    if (values) {
      this._textInput = values.text ?? "";
      this._selectedCategories = new Set(values.selectedCategories ?? []);
    } else {
      this._textInput = "";
      this._selectedCategories = new Set();
    }
  }

  /**
   * Stores the current value of the text area used to collect feedback.
   */
  _handleTextInput(event: InputEvent) {
    this._textInput = (event.currentTarget as HTMLTextAreaElement).value;
  }

  /**
   * Called when the user clicks the submit button.
   */
  _handleSubmit() {
    this.dispatchEvent(
      new CustomEvent<FeedbackSubmitDetails>("feedback-submit", {
        detail: {
          text: this._textInput,
          selectedCategories: Array.from(this._selectedCategories),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Called then the user clicks the close button.
   */
  _handleCancel() {
    this.dispatchEvent(
      new CustomEvent("feedback-close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Called when a category button is clicked.
   */
  _handleCategoryClick(event: MouseEvent) {
    if (this.isReadonly) {
      return;
    }

    const button = event.currentTarget as HTMLElement | null;
    const category = button?.getAttribute("data-content");
    if (!category) {
      return;
    }

    const nextSelection = new Set(this._selectedCategories);
    if (nextSelection.has(category)) {
      nextSelection.delete(category);
    } else {
      nextSelection.add(category);
    }

    this._selectedCategories = nextSelection;
  }

  render() {
    const containerClasses = [`${prefix}--container`];
    if (!this.isOpen) {
      containerClasses.push(`${prefix}--is-closed`);
    }

    return html`<div class="${containerClasses.join(" ")}">
      <div class="${prefix}--title-row">
        <div class="${prefix}--title">
          ${this.title || "Provide additional feedback"}
        </div>
      </div>
      ${this.showPrompt
        ? html`<div class="${prefix}--prompt">
            ${this.prompt || "What do you think of this response?"}
          </div>`
        : ""}
      ${this.categories?.length
        ? html`<div class="${prefix}--categories">
            <div
              class="${prefix}--tag-list-container"
              role="group"
              aria-label="${this.categoriesLabel || "Feedback categories"}"
            >
              ${this.categories.map(
                (value) =>
                  html`<cds-chat-button
                    class="${prefix}--tag-list-button"
                    kind="primary"
                    size="sm"
                    type="button"
                    is-quick-action
                    aria-pressed="${this._selectedCategories.has(value)}"
                    ?is-selected=${this._selectedCategories.has(value)}
                    data-content="${value}"
                    ?disabled=${this.isReadonly}
                    @click=${this._handleCategoryClick}
                  >
                    ${value}
                  </cds-chat-button>`,
              )}
            </div>
          </div>`
        : ""}
      ${this.showTextArea
        ? html`<div class="${prefix}--feedback-text">
            <cds-textarea
              id="${this.id}-text-area"
              value="${this._textInput}"
              class="${prefix}--feedback-text-area"
              ?disabled=${this.isReadonly}
              placeholder="${this.placeholder ||
              "Provide additional feedback..."}"
              rows="3"
              max-count="${MAX_TEXT_COUNT}"
              @input=${this._handleTextInput}
            ></cds-textarea>
          </div>`
        : ""}
      ${this.disclaimer
        ? html`<div class="${prefix}--disclaimer">
            <cds-aichat-markdown
              .markdown=${this.disclaimer}
            ></cds-aichat-markdown>
          </div>`
        : ""}
      <div class="${prefix}--buttons">
        <div class="${prefix}--cancel" data-rounded="bottom-left">
          <cds-button
            ?disabled=${this.isReadonly}
            size="lg"
            kind="secondary"
            @click=${this._handleCancel}
          >
            ${this.cancelLabel || "Cancel"}
          </cds-button>
        </div>
        <div class="${prefix}--submit" data-rounded="bottom-right">
          <cds-button
            ?disabled=${this.isReadonly}
            size="lg"
            kind="primary"
            @click=${this._handleSubmit}
          >
            ${this.submitLabel || "Submit"}
          </cds-button>
        </div>
      </div>
    </div>`;
  }
}

/**
 * The details included when the user clicked the submit button.
 */
interface FeedbackSubmitDetails {
  /**
   * The text from the text field.
   */
  text?: string;

  /**
   * The list of categories selected by the user.
   */
  selectedCategories?: string[];
}

/**
 * The set of initial values that are permitted.
 */
type FeedbackInitialValues = FeedbackSubmitDetails | null;

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-feedback": CDSAIChatFeedback;
  }
}

export {
  CDSAIChatFeedback,
  type FeedbackSubmitDetails,
  type FeedbackInitialValues,
};
export default CDSAIChatFeedback;
