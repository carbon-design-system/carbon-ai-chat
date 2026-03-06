/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./reasoning-steps-toggle.scss?lit";
import prefix from "../../../globals/settings.js";

/**
 * Reasoning steps toggle component
 * @element cds-aichat-reasoning-steps-toggle
 */
@carbonElement(`${prefix}-reasoning-steps-toggle`)
class CDSAIChatReasoningStepsToggle extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Indicates if the reasoning steps panel is open.
   */
  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  /**
   * Label text when the panel is open.
   */
  @property({ type: String, attribute: "open-label-text", reflect: true })
  openLabelText = "Hide reasoning steps";

  /**
   * Label text when the panel is closed.
   */
  @property({ type: String, attribute: "closed-label-text", reflect: true })
  closedLabelText = "Show reasoning steps";

  /**
   * The ID of the panel controlled by this button.
   */
  @property({ type: String, attribute: "panel-id", reflect: true })
  panelID?: string;

  /**
   * Whether the control should be disabled.
   */
  @property({ type: Boolean, attribute: "disabled", reflect: true })
  disabled = false;

  handleToggleClick() {
    if (this.disabled) {
      return;
    }
    const nextOpen = !this.open;
    this.open = nextOpen;
    this.dispatchEvent(
      new CustomEvent<ReasoningStepsToggleEventDetail>(
        "reasoning-steps-toggle",
        {
          detail: { open: nextOpen },
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
        class="${prefix}--reasoning-steps-toggle"
        type="button"
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls=${ifDefined(this.panelID)}
        ?disabled=${this.disabled}
        @click=${this.handleToggleClick}
      >
        <span class="${prefix}--reasoning-steps-toggle-label"
          >${labelText}</span
        >
        <span
          class="${prefix}--reasoning-steps-toggle-caret"
          aria-hidden="true"
        >
          ${iconLoader(ChevronDown16)}
        </span>
      </button>
    `;
  }
}

interface ReasoningStepsToggleEventDetail {
  open: boolean;
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-reasoning-steps-toggle": CDSAIChatReasoningStepsToggle;
  }
}

export { CDSAIChatReasoningStepsToggle, type ReasoningStepsToggleEventDetail };
export default CDSAIChatReasoningStepsToggle;
