/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../../markdown/index.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";
import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/layer/index.js";
import "@carbon/web-components/es/components/textarea/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Close16 from "@carbon/icons/es/close/16.js";
import { html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
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
  @property({ type: Object, attribute: false, reflect: true })
  initialValues?: FeedbackInitialValues;

  /**
   * The maximum number of characters allowed in the feedback text area.
   */
  @property({ type: Number, attribute: "max-length", reflect: true })
  maxLength?: number;

  /**
   * The title to display in the popup. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "title", reflect: true })
  title = "Provide additional feedback";

  /**
   * The body text to display to the user. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "body", reflect: true })
  body = "What do you think of this response?";

  /**
   * The list of categories to show.
   */
  @property({ type: Array, attribute: false, reflect: true })
  categories?: string[];

  /**
   * The legal disclaimer text to show at the bottom of the popup. This text may contain rich markdown content. If this
   * value is not provided, no text will be shown.
   */
  @property({ type: String, attribute: "disclaimer", reflect: true })
  disclaimer?: string;

  /**
   * The label text to display with the disclaimer checkbox. If this value is not provided, no checkbox or label text will be displayed.
   */
  @property({ type: String, attribute: "disclaimer-checkbox", reflect: true })
  disclaimerCheckbox?: string;

  /**
   * The placeholder to show in the text area. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "text-area-placeholder", reflect: true })
  placeholder = "Provide additional feedback...";

  /**
   * The label for the primary button. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "primary-label", reflect: true })
  primaryLabel?: string;

  /**
   * The accessible label for the categories listbox. This label is used by screen readers to describe the purpose of the category selection list.
   */
  @property({ type: String, attribute: "categories-label", reflect: true })
  categoriesLabel?: string;

  /**
   * Indicates whether the text area should be shown.
   */
  @property({ type: Boolean, attribute: "show-text-area", reflect: true })
  showTextArea = false;

  /**
   * Indicates whether the body line should be shown.
   */
  @property({ type: Boolean, attribute: "show-body", reflect: true })
  showBody = false;

  /**
   * Enables Compact mode with no border, compact spacing, single-line categories, and "Other" button with conditional textarea.
   */
  @property({ type: Boolean, attribute: "compact", reflect: true })
  compact = false;

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
   * Indicates if the submit feedback button is disabled.
   */
  @state()
  _isSubmitDisabled = false;

  /**
   * Indicates if the "Other" textarea should be shown (Compact mode only).
   *
   * @internal
   */
  @state()
  _showOtherInput = false;

  /**
   * Indicates if the "Other" textarea has a validation error (Compact mode only).
   *
   * @internal
   */
  @state()
  _textareaError = false;

  /**
   * Called when the properties of the component have changed.
   */
  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("initialValues")) {
      this._setInitialValues(this.initialValues);
    }

    if (changedProperties.has("disclaimerCheckbox")) {
      this._isSubmitDisabled = Boolean(this.disclaimerCheckbox);
    }
  }

  /**
   * Called when the component is connected to the document.
   */
  connectedCallback() {
    super.connectedCallback();
    this._isSubmitDisabled = Boolean(this.disclaimerCheckbox);
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
    // Clear error when user starts typing
    if (this._textareaError && this._textInput.trim()) {
      this._textareaError = false;
    }
  }

  /**
   * Called when the user presses a key in the textarea (Compact mode).
   */
  _handleTextKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      // Validate that textarea is not empty
      if (!this._textInput.trim()) {
        this._textareaError = true;
        return;
      }

      this._textareaError = false;
      this._handleSubmit();
    }
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

    // In compact mode, clear the textarea content after submission
    if (this.compact) {
      this._textInput = "";
      this._textareaError = false;
    }
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

    // In compact mode, single-click submits immediately (except for "Other")
    if (this.compact && category !== "Other") {
      // Clear all selections and select only this category
      this._selectedCategories = new Set([category]);
      this._showOtherInput = false;
      // Submit immediately
      this._handleSubmit();
      return;
    }

    const nextSelection = new Set(this._selectedCategories);

    // Handle "Other" button specially in compact mode
    if (this.compact && category === "Other") {
      if (nextSelection.has("Other")) {
        // Deselecting "Other"
        nextSelection.delete("Other");
        this._showOtherInput = false;
      } else {
        // Selecting "Other" - clear all other categories first
        nextSelection.clear();
        nextSelection.add("Other");
        this._showOtherInput = true;
      }
    } else {
      // Standard multi-select behavior for regular categories (non-compact mode)
      if (nextSelection.has(category)) {
        nextSelection.delete(category);
      } else {
        nextSelection.add(category);
      }
    }

    this._selectedCategories = nextSelection;
  }

  /**
   * Called when a key is pressed on a category button (compact mode only).
   * Prevents Enter key from activating the "Other" button.
   */
  _handleCategoryKeyDown(event: KeyboardEvent) {
    if (!this.compact) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const category = target.getAttribute("data-content");

    // Prevent Enter key from activating "Other" button
    if (event.key === "Enter" && category === "Other") {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Called when a key is pressed in compact mode (for Enter key submission).
   */
  _handleCompactKeyDown(event: KeyboardEvent) {
    if (this.isReadonly || !this.compact) {
      return;
    }

    // Submit on Enter key if categories are selected and "Other" input is not showing
    if (event.key === "Enter" && !event.shiftKey && !this._showOtherInput) {
      // Don't submit if "Other" is the only selected category (prevent activating "Other" button)
      if (
        this._selectedCategories.size > 0 &&
        !this._selectedCategories.has("Other")
      ) {
        event.preventDefault();
        this._handleSubmit();
      } else if (this._selectedCategories.has("Other")) {
        // Prevent Enter from clicking the "Other" button
        event.preventDefault();
      }
    }
  }

  /**
   * Called when the disclaimer checkbox state changes.
   */
  _handleDisclaimerCheckboxChange(event: Event) {
    this._isSubmitDisabled = !(event.currentTarget as HTMLInputElement).checked;
  }

  render() {
    const containerClasses = {
      [`${prefix}--container`]: true,
      [`${prefix}--is-closed`]: !this.isOpen,
      [`${prefix}--compact`]: this.compact,
    };

    // In compact mode: show only first 3 categories plus "Other"
    const categoriesToShow =
      this.compact && this.categories?.length
        ? [...this.categories.slice(0, 3), "Other"]
        : this.categories;

    return html`<div class="${classMap(containerClasses)}">
      ${!this.compact
        ? html`<div class="${prefix}--close" data-rounded="top-right">
            <cds-icon-button
              size="lg"
              align="top-right"
              kind="ghost"
              ?disabled=${this.isReadonly}
              @click=${this._handleCancel}
            >
              <span slot="icon">${iconLoader(Close16)}</span>
              <span slot="tooltip-content">Close</span>
            </cds-icon-button>
          </div>`
        : ""}
      ${!this.compact
        ? html`<div class="${prefix}--title-row">
            <div class="${prefix}--title">${this.title}</div>
          </div>`
        : ""}
      <div class="${prefix}--body">
        <div class="${prefix}--body-content">
          <div class="${prefix}--prompt-categories">
            ${this.showBody && !this.compact
              ? html`<div class="${prefix}--prompt">${this.body}</div>`
              : ""}
            ${categoriesToShow?.length
              ? html`<div
                  class="${prefix}--categories"
                  @keydown=${this.compact ? this._handleCompactKeyDown : null}
                  tabindex="${this.compact ? "0" : "-1"}"
                >
                  <div
                    class="${prefix}--tag-list-container ${prefix}--tag-list-compact-container"
                    role="group"
                    aria-label="${this.categoriesLabel ||
                    "Feedback categories"}"
                  >
                    ${categoriesToShow.map(
                      (value) =>
                        html`<cds-selectable-tag
                          class="${prefix}--tag-list-button"
                          size="md"
                          text="${value}"
                          data-content="${value}"
                          ?selected=${this._selectedCategories.has(value)}
                          ?disabled=${this.isReadonly}
                          @click=${this._handleCategoryClick}
                          @keydown=${this.compact
                            ? this._handleCategoryKeyDown
                            : null}
                        ></cds-selectable-tag>`,
                    )}
                  </div>
                  ${this.compact && !this._showOtherInput
                    ? html`<div class="${prefix}--helper-text">
                        Single-click a category to submit your feedback
                      </div>`
                    : ""}
                </div>`
              : ""}
          </div>
          <div class="${prefix}--feedback-text">
            ${this.showTextArea || (this.compact && this._showOtherInput)
              ? html`<div class="${prefix}--feedback-input">
                  <cds-textarea
                    id="${this.id}-text-area"
                    value="${this._textInput}"
                    class="${prefix}--feedback-text-area"
                    ?disabled=${this.isReadonly}
                    ?invalid=${this._textareaError}
                    placeholder="${this.compact
                      ? "Type your feedback and Press ENTER/RETURN."
                      : this.placeholder}"
                    rows="3"
                    max-count="${MAX_TEXT_COUNT}"
                    @input=${this._handleTextInput}
                    @keydown=${this.compact ? this._handleTextKeyDown : null}
                  ></cds-textarea>
                  ${this._textareaError && this.compact
                    ? html`<div
                        class="${prefix}--feedback-error"
                        style="color: #da1e28; font-size: 0.75rem; margin-top: 0.25rem;"
                      >
                        Feedback text is required
                      </div>`
                    : ""}
                </div>`
              : ""}
            ${this.disclaimer && !this.compact
              ? html`<div class="${prefix}--disclaimer">
                  <cds-aichat-markdown
                    .markdown=${this.disclaimer}
                  ></cds-aichat-markdown>
                </div>`
              : ""}
          </div>
          ${this.disclaimerCheckbox && !this.compact
            ? html`<cds-checkbox
                class="${prefix}--disclaimer-checkbox"
                ?disabled=${this.isReadonly}
                @cds-checkbox-changed=${this._handleDisclaimerCheckboxChange}
                label-text=${this.disclaimerCheckbox}
              >
              </cds-checkbox>`
            : ""}
        </div>
        ${!this.compact
          ? html`<div class="${prefix}--buttons">
              <div class="${prefix}--submit" data-rounded="bottom-right">
                <cds-button
                  ?disabled=${this.isReadonly || this._isSubmitDisabled}
                  size="lg"
                  kind="primary"
                  @click=${this._handleSubmit}
                >
                  ${this.primaryLabel || "Submit"}
                </cds-button>
              </div>
            </div>`
          : ""}
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
