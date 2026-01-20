/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { property, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronRight16 from "@carbon/icons/es/chevron--right/16.js";

// @ts-ignore
import styles from "./reasoning-step.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators";

const baseClass = `${prefix}--reasoning-step`;
let idCounter = 0;

const generateId = (segment: string) =>
  `${baseClass}-${segment}-${idCounter++}`;

/**
 * Reasoning step component
 * @element cds-aichat-reasoning-step
 */
@carbonElement(`${prefix}-reasoning-step`)
class CDSAIChatReasoningStep extends LitElement {
  static styles = styles;

  @property({ type: String, attribute: "title" })
  title = "";

  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  @property({ type: Boolean, attribute: "controlled", reflect: true })
  controlled = false;

  /**
   * @internal
   */
  @state()
  private hasBodyContent = false;

  /**
   * @internal
   */
  private headerId = generateId("header");

  /**
   * @internal
   */
  private contentId = generateId("content");

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "listitem");
    }

    super.connectedCallback();
    this.evaluateBodyContent();
  }

  firstUpdated() {
    const slot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])");
    const nodes = slot?.assignedNodes({ flatten: true });
    this.evaluateBodyContent(nodes);
    this.updatePanelInertState();
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (
      changedProperties.has("open") ||
      changedProperties.has("hasBodyContent")
    ) {
      this.updatePanelInertState();
    }
  }

  private getTriggerElement(): HTMLButtonElement | null {
    if (!this.shadowRoot) {
      return null;
    }

    return this.shadowRoot.querySelector<HTMLButtonElement>(
      `.${baseClass}__trigger`,
    );
  }

  private evaluateBodyContent(nodes?: readonly Node[]) {
    const nodesToInspect = nodes ?? Array.from(this.childNodes);
    const hasContent = nodesToInspect.some((node) => this.isBodyNode(node));

    if (hasContent !== this.hasBodyContent) {
      this.hasBodyContent = hasContent;

      if (!hasContent && this.open && !this.controlled) {
        this.open = false;
      }

      this.updatePanelInertState();
    }
  }

  private isBodyNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const slotName = element.getAttribute("slot");

      return !slotName;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim());
    }

    return false;
  }

  private handleBodySlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const nodes = slot.assignedNodes({ flatten: true });

    this.evaluateBodyContent(nodes);
    this.updatePanelInertState();
  }

  private handleToggleRequest(nextState = !this.open) {
    const detail = { open: nextState };
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    };
    const canToggle = this.dispatchEvent(
      new CustomEvent("reasoning-step-beingtoggled", init),
    );

    if (!canToggle) {
      return;
    }

    if (!this.controlled) {
      this.open = nextState;
    }

    this.dispatchEvent(new CustomEvent("reasoning-step-toggled", init));
  }

  private handleButtonClick() {
    this.handleToggleRequest(!this.open);
  }

  private handleButtonKeydown(event: KeyboardEvent) {
    if (!this.open) {
      return;
    }

    if (event.key === "Escape" || event.key === "Esc") {
      event.stopPropagation();
      this.handleToggleRequest(false);
    }
  }

  focus(options?: FocusOptions) {
    const trigger = this.getTriggerElement();

    if (trigger) {
      trigger.focus(options);
      return;
    }

    super.focus(options);
  }

  private renderInteractiveHeader() {
    return html`
      <button
        id=${this.headerId}
        type="button"
        part="expando"
        class="${baseClass}__trigger"
        aria-expanded="${String(this.open)}"
        aria-controls="${this.contentId}"
        @click=${this.handleButtonClick}
        @keydown=${this.handleButtonKeydown}
      >
        <span class="${baseClass}__icon" part="expando-icon" aria-hidden="true">
          ${iconLoader(ChevronRight16)}
        </span>
        <div class="${baseClass}__title" part="title">
          <slot name="title">${this.title}</slot>
        </div>
      </button>
    `;
  }

  private renderStaticHeader() {
    return html`
      <div class="${baseClass}__static" id=${this.headerId}>
        <span class="${baseClass}__static-icon" aria-hidden="true"
          >&mdash;</span
        >
        <div class="${baseClass}__title" part="title">
          <slot name="title">${this.title}</slot>
        </div>
      </div>
    `;
  }

  private renderPanel() {
    const isHidden = !this.hasBodyContent;
    const panelClasses = classMap({
      [`${baseClass}__panel`]: true,
      [`${baseClass}__panel--hidden`]: isHidden,
    });

    return html`
      <div
        id=${this.contentId}
        class=${panelClasses}
        part="wrapper"
        aria-hidden="${this.open && !isHidden ? "false" : "true"}"
        role=${ifDefined(!isHidden ? "region" : undefined)}
        aria-labelledby=${ifDefined(!isHidden ? this.headerId : undefined)}
        ?hidden=${isHidden}
      >
        <div
          class="${baseClass}__panel-body"
          part="content"
          data-visible="${this.open && !isHidden}"
        >
          <slot
            @slotchange=${this.handleBodySlotChange}
            ?hidden=${isHidden}
          ></slot>
        </div>
      </div>
    `;
  }

  /**
   * Apply/remove inert on assigned elements so they are untabbable when closed.
   */
  private updatePanelInertState() {
    const slot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])");

    if (!slot) {
      return;
    }

    const shouldInert = !this.open || !this.hasBodyContent;
    const assignedElements = slot.assignedElements({ flatten: true });

    assignedElements.forEach((element) => {
      element.toggleAttribute("inert", shouldInert);
    });
  }

  render() {
    const classes = classMap({
      [baseClass]: true,
      [`${baseClass}--open`]: this.open && this.hasBodyContent,
      [`${baseClass}--static`]: !this.hasBodyContent,
    });

    return html`
      <div class=${classes}>
        ${this.hasBodyContent
          ? this.renderInteractiveHeader()
          : this.renderStaticHeader()}
        ${this.renderPanel()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-reasoning-step": CDSAIChatReasoningStep;
  }
}

export { CDSAIChatReasoningStep };
export default CDSAIChatReasoningStep;
