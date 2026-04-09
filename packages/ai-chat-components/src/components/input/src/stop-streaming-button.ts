/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import "@carbon/web-components/es/components/icon-button/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import StopFilled16 from "@carbon/icons/es/stop--filled/16.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/defs.js";

import styles from "./stop-streaming-button.scss?lit";

/**
 * Stop streaming button component for AI Chat input.
 *
 * @element cds-aichat-stop-streaming-button
 */
@carbonElement(`${prefix}-stop-streaming-button`)
class StopStreamingButton extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The label to display in the button tooltip.
   */
  @property({ type: String, attribute: "label" })
  label = "";

  /**
   * The direction to align the tooltip to the button.
   */
  @property({ type: String, attribute: "tooltip-alignment" })
  tooltipAlignment = "";

  /**
   * Determines whether the stop generating button is disabled.
   */
  @property({ type: Boolean, attribute: "disabled" })
  disabled = false;

  /**
   * The callback function that is called when the user clicks the stop streaming button.
   */
  @property({ type: Object })
  onClick: (() => void) | undefined;

  _handleOnClick = () => {
    this.onClick?.();
  };

  render() {
    return html`
      <cds-icon-button
        class="${prefix}--stop-streaming-button"
        align="${this.tooltipAlignment}"
        kind="${BUTTON_KIND.GHOST}"
        size="${BUTTON_SIZE.SMALL}"
        ?disabled=${this.disabled}
        @click="${this._handleOnClick}"
      >
        <span slot="icon">
          <span
            class="${prefix}--stop-icon ${this.disabled
              ? `${prefix}--stop-icon--disabled`
              : ""}"
            >${iconLoader(StopFilled16)}</span
          >
        </span>
        <span slot="tooltip-content">${this.label}</span>
      </cds-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-stop-streaming-button": StopStreamingButton;
  }
}

export default StopStreamingButton;
