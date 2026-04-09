/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "@carbon/web-components/es/components/button/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Send16 from "@carbon/icons/es/send/16.js";
import SendFilled16 from "@carbon/icons/es/send--filled/16.js";

import {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
} from "@carbon/web-components/es/components/button/defs.js";

import "./stop-streaming-button.js";

import styles from "./send-control.scss?lit";

/**
 * Send control component — renders the send button or stop streaming button.
 *
 * When slotted inside a `cds-aichat-input-shell`, the send button is also
 * automatically disabled whenever the shell reports that the input is over
 * its `maxLength`. The element subscribes to the shell's
 * `cds-aichat-input-over-max-change` event on connect; consumers who compose
 * this outside of an input-shell are unaffected.
 *
 * @element cds-aichat-input-send-control
 * @fires {CustomEvent} cds-aichat-input-send - Fired when the send button is clicked
 * @fires {CustomEvent} cds-aichat-input-stop-streaming - Fired when the stop streaming button is clicked
 */
@carbonElement(`${prefix}-input-send-control`)
class InputSendControlElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** Whether the input has valid content that can be sent. */
  @property({ type: Boolean, attribute: "has-valid-input" })
  hasValidInput = false;

  /** Whether the entire input is disabled. */
  @property({ type: Boolean, attribute: "disabled" })
  disabled = false;

  /** Whether sending is disabled (separate from overall disabled state). */
  @property({ type: Boolean, attribute: "disable-send" })
  disableSend = false;

  /** Show the stop streaming button instead of the send button. */
  @property({ type: Boolean, attribute: "show-stop-streaming" })
  isStopStreamingButtonVisible = false;

  /** Whether the stop streaming button is disabled. */
  @property({ type: Boolean, attribute: "disable-stop-streaming" })
  isStopStreamingButtonDisabled = false;

  /** Label for the send button tooltip. */
  @property({ type: String, attribute: "button-label" })
  buttonLabel = "Send";

  /** Label for the stop streaming button tooltip. */
  @property({ type: String, attribute: "stop-response-label" })
  stopResponseLabel = "Stop response";

  /** Test identifier. */
  @property({ type: String, attribute: "test-id" })
  testId?: string;

  /**
   * Mirrors the parent input-shell's `over-max-length` state. Set via event
   * subscription in `connectedCallback`; treated as part of the disabled
   * condition for the send button.
   */
  @state()
  private _overMax = false;

  /** Shell element we're subscribed to, for clean unsubscription on disconnect. */
  private _subscribedShell: Element | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const shell = this.closest("cds-aichat-input-shell");
    if (shell) {
      this._overMax = shell.hasAttribute("over-max-length");
      shell.addEventListener(
        "cds-aichat-input-over-max-change",
        this._handleOverMaxChange,
      );
      this._subscribedShell = shell;
    }
  }

  disconnectedCallback(): void {
    this._subscribedShell?.removeEventListener(
      "cds-aichat-input-over-max-change",
      this._handleOverMaxChange,
    );
    this._subscribedShell = null;
    super.disconnectedCallback();
  }

  private _handleOverMaxChange = (event: Event) => {
    this._overMax = (event as CustomEvent<{ overMax: boolean }>).detail.overMax;
  };

  private _handleSendClick = () => {
    if (
      this.disabled ||
      this.disableSend ||
      this._overMax ||
      !this.hasValidInput
    ) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-send", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handleStopStreamingClick = () => {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-stop-streaming", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    // Check if RTL direction is set
    const isRTL =
      document.dir === "rtl" || document.documentElement.dir === "rtl";

    const showDisabledSend =
      !this.hasValidInput || this.disabled || this.disableSend || this._overMax;

    if (this.isStopStreamingButtonVisible) {
      return html`
        <cds-aichat-stop-streaming-button
          label="${this.stopResponseLabel}"
          ?disabled="${this.isStopStreamingButtonDisabled}"
          tooltip-alignment="${isRTL ? "top-left" : "top-right"}"
          @click="${this._handleStopStreamingClick}"
        ></cds-aichat-stop-streaming-button>
      `;
    }

    return html`
      <cds-button
        class="${prefix}--input-send-button"
        kind="${BUTTON_KIND.GHOST}"
        size="${BUTTON_SIZE.SMALL}"
        type="${BUTTON_TYPE.BUTTON}"
        ?disabled="${showDisabledSend}"
        tooltip-text="${this.buttonLabel}"
        tooltip-alignment="${isRTL
          ? BUTTON_TOOLTIP_ALIGNMENT.START
          : BUTTON_TOOLTIP_ALIGNMENT.END}"
        tooltip-position="${BUTTON_TOOLTIP_POSITION.TOP}"
        @click="${this._handleSendClick}"
        aria-label="${this.buttonLabel}"
        data-testid="${this.testId ? `${this.testId}-send` : ""}"
      >
        ${this.hasValidInput
          ? iconLoader(SendFilled16, { slot: "icon" })
          : iconLoader(Send16, { slot: "icon" })}
      </cds-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-input-send-control": InputSendControlElement;
  }
}

export default InputSendControlElement;
