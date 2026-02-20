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
import styles from "./chain-of-thought.scss?lit";
import prefix from "../../../globals/settings.js";
import { uuid } from "../../../globals/utils/uuid.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import type {
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepToggleEventDetail,
  ChainOfThoughtToggleEventDetail,
} from "../defs.js";
import type { CDSAIChatChainOfThoughtStep } from "./chain-of-thought-step.js";

const stepSelector = `${prefix}-chain-of-thought-step`;

/**
 * Chain of thought container component
 * @element cds-aichat-chain-of-thought
 */
@carbonElement(`${prefix}-chain-of-thought`)
class CDSAIChatChainOfThought extends LitElement {
  static styles = styles;

  /**
   * Indicates if the details panel for the chain of thought is open.
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  /**
   * When true, each child step should be fully controlled by the host.
   */
  @property({ type: Boolean, reflect: true })
  controlled = false;

  /**
   * ID of the content panel. Useful for wiring to an external toggle.
   */
  @property({ type: String, attribute: "panel-id", reflect: true })
  panelId = `${prefix}-chain-of-thought-panel-id-${uuid()}`;

  /**
   * Optional function to call if chain of thought visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onToggle?: ChainOfThoughtOnToggle;

  /**
   * Optional function to call if a chain of thought step visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onStepToggle?: ChainOfThoughtOnToggle;

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
    }
    this.addEventListener(
      "chain-of-thought-step-toggled",
      this.handleStepToggle as EventListener,
    );
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.removeEventListener(
      "chain-of-thought-step-toggled",
      this.handleStepToggle as EventListener,
    );
    super.disconnectedCallback();
  }

  get steps(): NodeListOf<CDSAIChatChainOfThoughtStep> {
    return this.querySelectorAll<CDSAIChatChainOfThoughtStep>(stepSelector);
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("controlled")) {
      this.propagateControlled();
    }

    if (
      changedProperties.has("open") &&
      changedProperties.get("open") !== undefined
    ) {
      this.dispatchToggleEvent();
    }
  }

  private handleStepToggle(
    event: CustomEvent<ChainOfThoughtStepToggleEventDetail>,
  ) {
    const { detail, target } = event;
    this.onStepToggle?.(Boolean(detail?.open), target as HTMLElement);
  }

  private propagateControlled() {
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

  private dispatchToggleEvent() {
    const detail: ChainOfThoughtToggleEventDetail = {
      open: this.open,
      panelId: this.panelId,
    };
    this.dispatchEvent(
      new CustomEvent<ChainOfThoughtToggleEventDetail>(
        "chain-of-thought-toggled",
        {
          detail,
          bubbles: true,
          composed: true,
        },
      ),
    );

    const panel = this.shadowRoot?.getElementById(this.panelId) ?? this;
    this.onToggle?.(this.open, panel as HTMLElement);
  }

  render() {
    return html`
      <div class="${prefix}--chain-of-thought">
        <div
          id=${this.panelId}
          class="${prefix}--chain-of-thought-content"
          aria-hidden=${this.open ? "false" : "true"}
          ?hidden=${!this.open}
        >
          <div class="${prefix}--chain-of-thought-inner-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chain-of-thought": CDSAIChatChainOfThought;
  }
}

export { CDSAIChatChainOfThought };
export default CDSAIChatChainOfThought;
