/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property, state } from "lit/decorators.js";

// @ts-ignore
import styles from "./tool-call-data.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/index.js";

const baseClass = `${prefix}--tool-call-data`;

/**
 * Tool call data component
 * @element cds-aichat-tool-call-data
 */
@carbonElement(`${prefix}-tool-call-data`)
class CDSAIChatToolCallData extends LitElement {
  static styles = styles;

  /**
   * Plain text name of the tool.
   */
  @property({ type: String, attribute: "tool-name" })
  toolName = "";

  /**
   * Text string used to label step input.
   */
  @property({ type: String, attribute: "input-label-text", reflect: true })
  inputLabelText = "Input";

  /**
   * Text string used to label step output.
   */
  @property({ type: String, attribute: "output-label-text", reflect: true })
  outputLabelText = "Output";

  /**
   * Text string used to label the tool.
   */
  @property({ type: String, attribute: "tool-label-text", reflect: true })
  toolLabelText = "Tool";

  /**
   * @internal
   */
  @state()
  private hasDescriptionSlot = false;

  /**
   * @internal
   */
  @state()
  private hasInputSlot = false;

  /**
   * @internal
   */
  @state()
  private hasOutputSlot = false;

  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => this.syncSlotContent());
  }

  firstUpdated() {
    this.syncSlotContent();
  }

  private handleSlotChange(
    slot: "description" | "input" | "output",
    event: Event,
  ) {
    const slotElement = event.target as HTMLSlotElement;
    const nodes = slotElement.assignedNodes({ flatten: true });
    const hasContent = this.hasAssignedContent(nodes);

    if (slot === "description" && hasContent !== this.hasDescriptionSlot) {
      this.hasDescriptionSlot = hasContent;
    }

    if (slot === "input" && hasContent !== this.hasInputSlot) {
      this.hasInputSlot = hasContent;
    }

    if (slot === "output" && hasContent !== this.hasOutputSlot) {
      this.hasOutputSlot = hasContent;
    }
  }

  private syncSlotContent() {
    const descriptionSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      'slot[name="description"]',
    );
    const inputSlot =
      this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="input"]');
    const outputSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      'slot[name="output"]',
    );

    if (descriptionSlot) {
      this.hasDescriptionSlot = this.hasAssignedContent(
        descriptionSlot.assignedNodes({ flatten: true }),
      );
    }

    if (inputSlot) {
      this.hasInputSlot = this.hasAssignedContent(
        inputSlot.assignedNodes({ flatten: true }),
      );
    }

    if (outputSlot) {
      this.hasOutputSlot = this.hasAssignedContent(
        outputSlot.assignedNodes({ flatten: true }),
      );
    }
  }

  private hasAssignedContent(nodes: readonly Node[]) {
    return nodes.some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return true;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim());
      }

      return false;
    });
  }

  render() {
    const hasToolName = Boolean(this.toolName);
    const hasContent =
      hasToolName ||
      this.hasDescriptionSlot ||
      this.hasInputSlot ||
      this.hasOutputSlot;

    if (!hasContent) {
      return html``;
    }

    return html`
      <div
        class="${baseClass} ${baseClass}-description"
        part="description"
        ?hidden=${!this.hasDescriptionSlot}
      >
        <slot
          name="description"
          @slotchange=${(event: Event) =>
            this.handleSlotChange("description", event)}
        ></slot>
      </div>
      ${hasToolName
        ? html`<div class="${baseClass} ${baseClass}-toolName">
            <div class="${baseClass}-label">${this.toolLabelText}</div>
            ${this.toolName}
          </div>`
        : null}
      <div
        class="${baseClass} ${baseClass}-input"
        ?hidden=${!this.hasInputSlot}
      >
        <div class="${baseClass}-label">${this.inputLabelText}</div>
        <slot
          name="input"
          @slotchange=${(event: Event) => this.handleSlotChange("input", event)}
        ></slot>
      </div>
      <div
        class="${baseClass} ${baseClass}-output"
        ?hidden=${!this.hasOutputSlot}
      >
        <div class="${baseClass}-label">${this.outputLabelText}</div>
        <slot
          name="output"
          @slotchange=${(event: Event) =>
            this.handleSlotChange("output", event)}
        ></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-tool-call-data": CDSAIChatToolCallData;
  }
}

export { CDSAIChatToolCallData };
export default CDSAIChatToolCallData;
