/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import styles from './tool-call-data.scss.js';
import prefix from '../../../globals/settings.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const baseClass = `${prefix}--tool-call-data`;
let CDSAIChatToolCallData = class CDSAIChatToolCallData extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Plain text name of the tool.
         */
        this.toolName = "";
        /**
         * Text string used to label step input.
         */
        this.inputLabelText = "Input";
        /**
         * Text string used to label step output.
         */
        this.outputLabelText = "Output";
        /**
         * Text string used to label the tool.
         */
        this.toolLabelText = "Tool";
        /**
         * @internal
         */
        this.hasDescriptionSlot = false;
        /**
         * @internal
         */
        this.hasInputSlot = false;
        /**
         * @internal
         */
        this.hasOutputSlot = false;
    }
    connectedCallback() {
        super.connectedCallback();
        queueMicrotask(() => this.syncSlotContent());
    }
    firstUpdated() {
        this.syncSlotContent();
    }
    handleSlotChange(slot, event) {
        const slotElement = event.target;
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
    syncSlotContent() {
        const descriptionSlot = this.shadowRoot?.querySelector('slot[name="description"]');
        const inputSlot = this.shadowRoot?.querySelector('slot[name="input"]');
        const outputSlot = this.shadowRoot?.querySelector('slot[name="output"]');
        if (descriptionSlot) {
            this.hasDescriptionSlot = this.hasAssignedContent(descriptionSlot.assignedNodes({ flatten: true }));
        }
        if (inputSlot) {
            this.hasInputSlot = this.hasAssignedContent(inputSlot.assignedNodes({ flatten: true }));
        }
        if (outputSlot) {
            this.hasOutputSlot = this.hasAssignedContent(outputSlot.assignedNodes({ flatten: true }));
        }
    }
    hasAssignedContent(nodes) {
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
        const hasContent = hasToolName ||
            this.hasDescriptionSlot ||
            this.hasInputSlot ||
            this.hasOutputSlot;
        if (!hasContent) {
            return html ``;
        }
        return html `
      <div
        class="${baseClass} ${baseClass}-description"
        part="description"
        ?hidden=${!this.hasDescriptionSlot}
      >
        <slot
          name="description"
          @slotchange=${(event) => this.handleSlotChange("description", event)}
        ></slot>
      </div>
      ${hasToolName
            ? html `<div class="${baseClass} ${baseClass}-toolName">
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
          @slotchange=${(event) => this.handleSlotChange("input", event)}
        ></slot>
      </div>
      <div
        class="${baseClass} ${baseClass}-output"
        ?hidden=${!this.hasOutputSlot}
      >
        <div class="${baseClass}-label">${this.outputLabelText}</div>
        <slot
          name="output"
          @slotchange=${(event) => this.handleSlotChange("output", event)}
        ></slot>
      </div>
    `;
    }
};
CDSAIChatToolCallData.styles = styles;
__decorate([
    property({ type: String, attribute: "tool-name" })
], CDSAIChatToolCallData.prototype, "toolName", void 0);
__decorate([
    property({ type: String, attribute: "input-label-text", reflect: true })
], CDSAIChatToolCallData.prototype, "inputLabelText", void 0);
__decorate([
    property({ type: String, attribute: "output-label-text", reflect: true })
], CDSAIChatToolCallData.prototype, "outputLabelText", void 0);
__decorate([
    property({ type: String, attribute: "tool-label-text", reflect: true })
], CDSAIChatToolCallData.prototype, "toolLabelText", void 0);
__decorate([
    state()
], CDSAIChatToolCallData.prototype, "hasDescriptionSlot", void 0);
__decorate([
    state()
], CDSAIChatToolCallData.prototype, "hasInputSlot", void 0);
__decorate([
    state()
], CDSAIChatToolCallData.prototype, "hasOutputSlot", void 0);
CDSAIChatToolCallData = __decorate([
    carbonElement("cds-aichat-tool-call-data")
], CDSAIChatToolCallData);
var CDSAIChatToolCallData_default = CDSAIChatToolCallData;

export { CDSAIChatToolCallData, CDSAIChatToolCallData_default as default };
//# sourceMappingURL=tool-call-data.js.map
