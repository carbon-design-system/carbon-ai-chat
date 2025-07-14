/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import styles from "./feedbackButtonsElement.scss";

class FeedbackButtonsElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Indicates if the details panel for the positive feedback is open.
   */
  @property({ type: Boolean, attribute: "is-positive-open", reflect: true })
  isPositiveOpen: boolean;

  /**
   * Indicates if the details panel for the negative feedback is open.
   */
  @property({ type: Boolean, attribute: "is-negative-open", reflect: true })
  isNegativeOpen: boolean;

  /**
   * Indicates if the positive feedback button should shown as selected.
   */
  @property({ type: Boolean, attribute: "is-positive-selected", reflect: true })
  isPositiveSelected: boolean;

  /**
   * Indicates if the positive feedback button will be used to show or hide a details panel.
   */
  @property({ type: Boolean, attribute: "has-positive-details", reflect: true })
  hasPositiveDetails: boolean;

  /**
   * Indicates if the negative feedback button will be used to show or hide a details panel.
   */
  @property({ type: Boolean, attribute: "has-negative-details", reflect: true })
  hasNegativeDetails: boolean;

  /**
   * Indicates if the positive feedback button should shown as selected.
   */
  @property({ type: Boolean, attribute: "is-negative-selected", reflect: true })
  isNegativeSelected: boolean;

  /**
   * Indicates if the positive feedback button should shown as disabled.
   */
  @property({ type: Boolean, attribute: "is-positive-disabled", reflect: true })
  isPositiveDisabled: boolean;

  /**
   * Indicates if the positive feedback button should shown as disabled.
   */
  @property({ type: Boolean, attribute: "is-negative-disabled", reflect: true })
  isNegativeDisabled: boolean;

  /**
   * The label for the positive button.
   */
  @property({ type: String, attribute: "positive-label", reflect: true })
  positiveLabel: string;

  /**
   * The label for the negative button.
   */
  @property({ type: String, attribute: "negative-label", reflect: true })
  negativeLabel: string;

  /**
   * The unique ID of the panel that is used for showing details.
   */
  @property({ type: String, attribute: "panel-id", reflect: true })
  panelID: string;

  /**
   * The callback that is called when one of the buttons is clicked.
   */
  @property({ type: Object, attribute: "on-click" })
  onClick: (isPositive: boolean) => void;
}

export { FeedbackButtonsElement };
