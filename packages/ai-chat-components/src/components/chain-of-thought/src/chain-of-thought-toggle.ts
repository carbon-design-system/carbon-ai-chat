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
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";

// @ts-ignore
import styles from "./chain-of-thought-toggle.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import type { ChainOfThoughtToggleEventDetail } from "../defs.js";

@carbonElement("cds-aichat-chain-of-thought-toggle")
class CDSAIChatChainOfThoughtToggle extends LitElement {
  static styles = styles;

  /**
   * Indicates if the chain of thought panel is open.
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  /**
   * Label text when the panel is open.
   */
  @property({ type: String, attribute: "open-label-text", reflect: true })
  openLabelText = "Hide chain of thought";

  /**
   * Label text when the panel is closed.
   */
  @property({ type: String, attribute: "closed-label-text", reflect: true })
  closedLabelText = "Show chain of thought";

  /**
   * The ID of the panel controlled by this button.
   */
  @property({ type: String, attribute: "panel-id", reflect: true })
  panelId?: string;

  /**
   * Whether the control should be disabled.
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  handleToggleClick() {
    if (this.disabled) {
      return;
    }
    const nextOpen = !this.open;
    this.open = nextOpen;
    this.dispatchEvent(
      new CustomEvent<ChainOfThoughtToggleEventDetail>(
        "chain-of-thought-toggle",
        {
          detail: { open: nextOpen, panelId: this.panelId },
          bubbles: true,
          composed: true,
        },
      ),
    );
  }

  render() {
    const labelText = this.open ? this.openLabelText : this.closedLabelText;

    return html`
      <button
        class="${prefix}--chain-of-thought-button"
        type="button"
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls=${ifDefined(this.panelId)}
        ?disabled=${this.disabled}
        @click=${this.handleToggleClick}
      >
        <span
          class="${prefix}--chain-of-thought-button-chevron"
          aria-hidden="true"
        >
          ${iconLoader(ChevronDown16)}
        </span>
        <span
          class="${prefix}--chain-of-thought-button-label"
          title=${labelText}
        >
          ${labelText}
        </span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chain-of-thought-toggle": CDSAIChatChainOfThoughtToggle;
  }
}

export { CDSAIChatChainOfThoughtToggle };
export default CDSAIChatChainOfThoughtToggle;
