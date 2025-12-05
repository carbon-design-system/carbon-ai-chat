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
// @ts-ignore
import styles from "./reasoning-steps-toggle.scss?lit";

class ReasoningStepsToggleElement extends LitElement {
  static styles = styles;

  /**
   * Indicates if the reasoning steps panel is open.
   */
  @property({ type: Boolean, reflect: true })
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
  @property({ type: Boolean, reflect: true })
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
}

interface ReasoningStepsToggleEventDetail {
  open: boolean;
}

export { ReasoningStepsToggleElement, type ReasoningStepsToggleEventDetail };
