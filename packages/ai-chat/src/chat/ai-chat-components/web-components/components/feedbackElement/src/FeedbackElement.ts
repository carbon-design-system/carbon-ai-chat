/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import styles from "./feedbackElement.scss";

/**
 * The component for displaying a panel requesting feedback from a user.
 */
class FeedbackElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The CSS class of this panel.
   */
  @property({ type: String, attribute: "class", reflect: true })
  class: string;

  /**
   * The ID of this panel.
   */
  @property({ type: String, reflect: true })
  id: string;

  /**
   * Indicates if the feedback details are open.
   */
  @property({ type: Boolean, attribute: "is-open", reflect: true })
  isOpen: boolean;

  /**
   * Indicates if the feedback details are readonly.
   */
  @property({ type: Boolean, attribute: "is-readonly", reflect: true })
  isReadonly: boolean;

  /**
   * The callback that is called when the user clicks the close button.
   */
  @property({ type: Object, attribute: "on-close" })
  onClose: () => void;

  /**
   * The callback that is called when the user clicks the submit button.
   */
  @property({ type: Object, attribute: "on-submit" })
  onSubmit: (details: FeedbackSubmitDetails) => void;

  /**
   * The initial values to display in the feedback.
   */
  @property({ type: Object, attribute: "initial-values", reflect: true })
  initialValues: FeedbackInitialValues;

  /**
   * The title to display in the popup. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "title", reflect: true })
  title: string;

  /**
   * The prompt text to display to the user. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "prompt", reflect: true })
  prompt: string;

  /**
   * The list of categories to show.
   */
  @property({ type: Object, attribute: "categories", reflect: true })
  categories: string[];

  /**
   * The legal disclaimer text to show at the bottom of the popup. This text may contain rich markdown content. If this
   * value is not provided, no text will be shown.
   */
  @property({ type: String, attribute: "disclaimer", reflect: true })
  disclaimer: string;

  /**
   * The placeholder to show in the text area. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "text-area-placeholder", reflect: true })
  placeholder: string;

  /**
   * The label for the cancel button. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "cancel-label", reflect: true })
  cancelLabel: string;

  /**
   * The label for the submit button. A default value will be used if no value is provided here.
   */
  @property({ type: String, attribute: "submit-label", reflect: true })
  submitLabel: string;

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
   * internal saved text values for feedback
   */
  @state()
  _textInput: string;

  /**
   * The initial set of categories to display as selected in the category list.
   */
  @state()
  _initialSelectedCategories: string[];

  /**
   * The current set of selected categories.
   */
  @state()
  _selectedCategories: string[];

  /**
   * Called when the properties of the component have changed.
   */
  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("initialValues")) {
      this._setInitialValues(this.initialValues);
    }
  }

  /**
   * Updates the initial values used in the component.
   */
  _setInitialValues(values: FeedbackInitialValues) {
    if (values) {
      this._textInput = values.text;
      this._initialSelectedCategories = values.selectedCategories;
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
    this.onSubmit?.({
      text: this._textInput,
      selectedCategories: this._selectedCategories,
    });
  }

  /**
   * Called then the user clicks the close button.
   */
  _handleCancel() {
    this.onClose?.();
  }

  /**
   * Called when the selected categories changes.
   */
  _handleCategoryChange = (selectedCategories: string[]) => {
    this._selectedCategories = selectedCategories;
  };
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
type FeedbackInitialValues = FeedbackSubmitDetails;

export { FeedbackElement, FeedbackSubmitDetails, FeedbackInitialValues };
