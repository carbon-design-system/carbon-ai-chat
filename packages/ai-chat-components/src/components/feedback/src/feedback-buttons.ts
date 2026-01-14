/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import { feedbackButtonsElementTemplate } from "./feedback-buttons.template.js";
import prefix from "../../../globals/settings.js";
// @ts-ignore
import styles from "./feedback-buttons.scss?lit";

/**
 * Feedback buttons component
 * @element cds-aichat-feedback-buttons
 */
@carbonElement(`${prefix}-feedback-buttons`)
class CDSAIChatFeedbackButtons extends LitElement {
  static styles = styles;

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
    return feedbackButtonsElementTemplate(this);
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
