/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";

// @ts-ignore
import styles from "./reasoning-steps.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators";

const baseClass = `${prefix}--reasoning-steps`;
const stepSelector = `${prefix}-reasoning-step`;

/**
 * Reasoning steps container component
 * @element cds-aichat-reasoning-steps
 */
@carbonElement(`${prefix}-reasoning-steps`)
class CDSAIChatReasoningSteps extends LitElement {
  static styles = styles;

  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  @property({ type: Boolean, attribute: "controlled", reflect: true })
  controlled = false;

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
    }

    super.connectedCallback();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("controlled")) {
      this.propagateControlled();
    }

    if (changedProperties.has("open")) {
      this.propagateOpen();
    }

    this.markLastVisibleStep();
  }

  /**
   * @internal
   */
  get steps(): NodeListOf<HTMLElement> {
    return this.querySelectorAll(stepSelector);
  }

  propagateOpen() {
    this.steps.forEach((step) => {
      if (this.open) {
        step.removeAttribute("inert");
      } else {
        step.setAttribute("inert", "");
      }
    });
  }

  propagateControlled() {
    this.steps.forEach((step) => {
      if (this.controlled) {
        step.setAttribute("data-parent-controlled", "");
        step.setAttribute("controlled", "");
      } else if (step.hasAttribute("data-parent-controlled")) {
        step.removeAttribute("data-parent-controlled");
        step.removeAttribute("controlled");
      }
    });
  }

  markLastVisibleStep() {
    const steps = Array.from(this.steps);

    steps.forEach((step) => {
      step.removeAttribute("data-last-item");
    });

    const lastVisible = steps.reverse().find((step) => !step.hidden);

    if (lastVisible) {
      lastVisible.setAttribute("data-last-item", "");
    }
  }

  render() {
    return html`
      <div class=${baseClass}>
        <div
          class="${baseClass}__wrapper"
          aria-hidden=${this.open ? "false" : "true"}
        >
          <div class="${baseClass}__body">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-reasoning-steps": CDSAIChatReasoningSteps;
  }
}

export { CDSAIChatReasoningSteps };
export default CDSAIChatReasoningSteps;
