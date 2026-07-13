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
import { html, LitElement, nothing, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./feedback.scss?lit";

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
    };

    return html`<div class="${classMap(containerClasses)}">
      <div class="${prefix}--close" data-rounded="top-right">
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
      </div>
      <div class="${prefix}--title-row">
        <div class="${prefix}--title">${this.title}</div>
      </div>
      <div class="${prefix}--body">
        <div class="${prefix}--body-content">
          <div class="${prefix}--prompt-categories">
            ${
              this.showBody
                ? html`<div class="${prefix}--prompt">${this.body}</div>`
                : ""
            }
            ${
              this.categories?.length
                ? html`<div class="${prefix}--categories">
                    <div
                      class="${prefix}--tag-list-container"
                      role="group"
                      aria-label="${
                        this.categoriesLabel || "Feedback categories"
                      }"
                    >
                      ${this.categories.map(
                        (value) =>
                          html`<cds-selectable-tag
                            class="${prefix}--tag-list-button"
                            size="md"
                            text="${value}"
                            data-content="${value}"
                            ?selected=${this._selectedCategories.has(value)}
                            ?disabled=${this.isReadonly}
                            @click=${this._handleCategoryClick}
                          ></cds-selectable-tag>`,
                      )}
                    </div>
                  </div>`
                : ""
            }
          </div>
          <div class="${prefix}--feedback-text">
            ${
              this.showTextArea
                ? html`<div class="${prefix}--feedback-input">
                    <cds-textarea
                      id="${this.id}-text-area"
                      value="${this._textInput}"
                      class="${prefix}--feedback-text-area"
                      ?disabled=${this.isReadonly}
                      placeholder="${this.placeholder}"
                      rows="3"
                      max-count="${this.maxLength ?? nothing}"
                      @input=${this._handleTextInput}
                    ></cds-textarea>
                  </div>`
                : ""
            }
            ${
              this.disclaimer
                ? html`<div class="${prefix}--disclaimer">
                    <cds-aichat-markdown
                      .markdown=${this.disclaimer}
                    ></cds-aichat-markdown>
                  </div>`
                : ""
            }
          </div>
          ${
            this.disclaimerCheckbox
              ? html`<cds-checkbox
                  class="${prefix}--disclaimer-checkbox"
                  ?disabled=${this.isReadonly}
                  @cds-checkbox-changed=${this._handleDisclaimerCheckboxChange}
                  label-text=${this.disclaimerCheckbox}
                >
                </cds-checkbox>`
              : ""
          }
        </div>
        <div class="${prefix}--buttons">
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
