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

import styles from "./stopStreamingButton.scss";

class StopStreamingButtonElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The label to display in the button tooltip.
   */
  @property({ type: String, attribute: "label" })
  label: string;

  /**
   * The direction to align the tooltip to the button.
   */
  @property({ type: String, attribute: "tooltip-alignment" })
  tooltipAlignment: string;

  /**
   * Determines whether the stop generating button is disabled.
   */
  @property({ type: Boolean, attribute: "disabled" })
  disabled: boolean;

  /**
   * The callback function that is called when the user clicks the stop streaming button.
   */
  @property({ type: Object })
  onClick: () => void;

  /**
   * Called when the user clicks the stop streaming button.
   */
  _handleOnClick = () => {
    this.onClick();
  };
}

export { StopStreamingButtonElement };
