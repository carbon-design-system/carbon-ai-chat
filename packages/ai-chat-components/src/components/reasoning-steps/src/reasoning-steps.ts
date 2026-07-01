/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
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
  static styles = [commonStyles, styles];

  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  @property({ type: Boolean, attribute: "controlled", reflect: true })
  controlled = false;

  connectedCallback() {
    super.connectedCallback();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("controlled")) {
      this.propagateControlled();
    }

    if (changedProperties.has("open")) {
      this.propagateOpen();
      // Skip the initial render (no previous value) — only announce real toggles.
      if (changedProperties.get("open") !== undefined) {
        this.emitAnimationEndWhenSettled();
      }
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

  /**
   * The wrapper animates `grid-template-rows` when the container expands/collapses.
   * We wait for any in-flight transition on the wrapper to finish, then emit a composed
   * event so consumers (e.g. the message list's scroll manager) can recalculate scroll
   * geometry against the settled layout.
   *
   * Using the Web Animations API (`getAnimations`) handles both cases with one path: when
   * a transition runs we resolve on its `finished` promise, and when nothing animates
   * (reduced motion, or an auto-collapse that snaps without a transition) there are no
   * animations so we emit immediately. The rAF lets the just-changed style flush so a
   * pending transition is registered before we read it.
   */
  private emitAnimationEndWhenSettled() {
    requestAnimationFrame(() => {
      const wrapper = this.shadowRoot?.querySelector<HTMLElement>(
        `.${baseClass}__wrapper`,
      );
      const emit = () =>
        this.dispatchEvent(
          new CustomEvent("reasoning-animation-end", {
            bubbles: true,
            composed: true,
            detail: { open: this.open },
          }),
        );
      // Only the `grid-template-rows` transition changes block size; awaiting the
      // wrapper's opacity/padding transitions too can delay the emit well past the
      // height settling. If it is not animating, the height is already final.
      const animations = (wrapper?.getAnimations?.() ?? []).filter(
        (animation): animation is CSSTransition =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === "grid-template-rows",
      );
      if (!animations.length) {
        emit();
        return;
      }
      Promise.allSettled(
        animations.map((animation) => animation.finished),
      ).then(emit);
    });
  }

  render() {
    return html`
      <div class=${baseClass}>
        <div
          class="${baseClass}__wrapper"
          aria-hidden=${this.open ? "false" : "true"}
        >
          <div class="${baseClass}__body" role="list">
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
