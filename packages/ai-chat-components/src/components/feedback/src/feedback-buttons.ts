/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/icon-button/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ThumbsDown16 from "@carbon/icons/es/thumbs-down/16.js";
import ThumbsDownFilled16 from "@carbon/icons/es/thumbs-down--filled/16.js";
import ThumbsUp16 from "@carbon/icons/es/thumbs-up/16.js";
import ThumbsUpFilled16 from "@carbon/icons/es/thumbs-up--filled/16.js";
import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./feedback-buttons.scss?lit";

const DEFAULT_POSITIVE_LABEL = "Good response";
const DEFAULT_NEGATIVE_LABEL = "Bad response";

/**
 * Feedback buttons component
 * @element cds-aichat-feedback-buttons
 */
@carbonElement(`${prefix}-feedback-buttons`)
class CDSAIChatFeedbackButtons extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Indicates if the details panel for the positive feedback is open.
   */
  @property({ type: Boolean, attribute: "is-positive-open", reflect: true })
  isPositiveOpen = false;

  /**
   * Indicates if the details panel for the negative feedback is open.
   */
  @property({ type: Boolean, attribute: "is-negative-open", reflect: true })
  isNegativeOpen = false;

  /**
   * Indicates if the positive feedback button should shown as selected.
   */
  @property({ type: Boolean, attribute: "is-positive-selected", reflect: true })
  isPositiveSelected = false;

  /**
   * Indicates if the positive feedback button will be used to show or hide a details panel.
   */
  @property({ type: Boolean, attribute: "has-positive-details", reflect: true })
  hasPositiveDetails = false;

  /**
   * Indicates if the negative feedback button will be used to show or hide a details panel.
   */
  @property({ type: Boolean, attribute: "has-negative-details", reflect: true })
  hasNegativeDetails = false;

  /**
   * Indicates if the positive feedback button should shown as selected.
   */
  @property({ type: Boolean, attribute: "is-negative-selected", reflect: true })
  isNegativeSelected = false;

  /**
   * Indicates if the positive feedback button should shown as disabled.
   */
  @property({ type: Boolean, attribute: "is-positive-disabled", reflect: true })
  isPositiveDisabled = false;

  /**
   * Indicates if the negative feedback button should shown as disabled.
   */
  @property({ type: Boolean, attribute: "is-negative-disabled", reflect: true })
  isNegativeDisabled = false;

  /**
   * The label for the positive button.
   */
  @property({ type: String, attribute: "positive-label", reflect: true })
  positiveLabel?: string;

  /**
   * The label for the negative button.
   */
  @property({ type: String, attribute: "negative-label", reflect: true })
  negativeLabel?: string;

  /**
   * The unique ID of the panel that is used for showing details.
   */
  @property({ type: String, attribute: "panel-id", reflect: true })
  panelID?: string;

  /**
   * Dispatches an event notifying listeners that a button has been clicked.
   */
  handleButtonClick(isPositive: boolean) {
    this.dispatchEvent(
      new CustomEvent<FeedbackButtonsClickEventDetail>(
        "feedback-buttons-click",
        {
          detail: { isPositive },
          bubbles: true,
          composed: true,
        },
      ),
    );
  }

  render() {
    const handleButtonClick = (isPositive: boolean) => {
      this.handleButtonClick(isPositive);
    };

    const feedbackPositiveControls = this.panelID
      ? `${this.panelID}-feedback-positive`
      : undefined;
    const feedbackNegativeControls = this.panelID
      ? `${this.panelID}-feedback-negative`
      : undefined;

    return html`<div class="${prefix}--feedback-buttons">
      <cds-icon-button
        class="${prefix}--feedback-buttons-positive"
        size="sm"
        align="top-left"
        kind="ghost"
        role="button"
        ?disabled=${this.isPositiveDisabled}
        aria-expanded="${this.isPositiveDisabled || !this.hasPositiveDetails
          ? nothing
          : this.isPositiveOpen}"
        aria-pressed="${this.isPositiveSelected || nothing}"
        ?aria-controls=${feedbackPositiveControls}
        @click="${() => handleButtonClick(true)}"
      >
        <span slot="icon"
          >${iconLoader(
            this.isPositiveSelected ? ThumbsUpFilled16 : ThumbsUp16,
          )}</span
        >
        <span slot="tooltip-content"
          >${this.positiveLabel || DEFAULT_POSITIVE_LABEL}</span
        >
      </cds-icon-button>
      <cds-icon-button
        class="${prefix}--feedback-buttons-negative"
        size="sm"
        align="top-left"
        kind="ghost"
        role="button"
        ?disabled=${this.isNegativeDisabled}
        aria-expanded="${this.isNegativeDisabled || !this.hasNegativeDetails
          ? nothing
          : this.isNegativeOpen}"
        aria-pressed="${this.isNegativeSelected || nothing}"
        ?aria-controls=${feedbackNegativeControls}
        @click="${() => handleButtonClick(false)}"
      >
        <span slot="icon"
          >${iconLoader(
            this.isNegativeSelected ? ThumbsDownFilled16 : ThumbsDown16,
          )}</span
        >
        <span slot="tooltip-content"
          >${this.negativeLabel || DEFAULT_NEGATIVE_LABEL}</span
        >
      </cds-icon-button>
    </div>`;
  }
}

interface FeedbackButtonsClickEventDetail {
  isPositive: boolean;
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-feedback-buttons": CDSAIChatFeedbackButtons;
  }
}

export { CDSAIChatFeedbackButtons, type FeedbackButtonsClickEventDetail };
export default CDSAIChatFeedbackButtons;
