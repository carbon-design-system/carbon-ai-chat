/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import '@carbon/web-components/es-custom/components/inline-loading/index.js';
import { LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { property, state } from 'lit/decorators.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16.js';
import ChevronRight16 from '@carbon/icons/es/chevron--right/16.js';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16.js';
import styles from './chain-of-thought-step.scss.js';
import prefix from '../../../globals/settings.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { ChainOfThoughtStepStatus } from '../defs.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const baseClass = `${prefix}--chain-of-thought-accordion-item`;
const statusClass = `${prefix}--chain-of-thought-accordion-item-header-status`;
const numberFormatter = new Intl.NumberFormat("en-US");
let idCounter = 0;
const generateId = (segment) => `${baseClass}-${segment}-${idCounter++}`;
let CDSAIChatChainOfThoughtStep = class CDSAIChatChainOfThoughtStep extends LitElement {
    constructor() {
        super(...arguments);
        this.title = "";
        this.stepNumber = 0;
        this.labelText = "";
        this.status = ChainOfThoughtStepStatus.SUCCESS;
        this.open = false;
        this.controlled = false;
        this.statusSucceededLabelText = "Succeeded";
        this.statusFailedLabelText = "Failed";
        this.statusProcessingLabelText = "Processing";
        /**
         * @internal
         */
        this.hasBodyContent = false;
        /**
         * @internal
         */
        this.headerId = generateId("header");
        /**
         * @internal
         */
        this.contentId = generateId("content");
    }
    connectedCallback() {
        if (!this.hasAttribute("role")) {
            this.setAttribute("role", "listitem");
        }
        super.connectedCallback();
        this.evaluateBodyContent();
        this.updateStepParity();
    }
    updated(changedProperties) {
        if (changedProperties.has("stepNumber")) {
            this.updateStepParity();
        }
    }
    firstUpdated() {
        const slot = this.shadowRoot?.querySelector("slot:not([name])");
        const nodes = slot?.assignedNodes({ flatten: true });
        if (nodes) {
            this.evaluateBodyContent(nodes);
        }
    }
    getTriggerElement() {
        if (!this.shadowRoot) {
            return null;
        }
        return this.shadowRoot.querySelector(`.${baseClass}-header`);
    }
    evaluateBodyContent(nodes) {
        const nodesToInspect = nodes ?? Array.from(this.childNodes);
        const hasContent = nodesToInspect.some((node) => this.isBodyNode(node));
        if (hasContent !== this.hasBodyContent) {
            this.hasBodyContent = hasContent;
            if (!hasContent && this.open && !this.controlled) {
                this.open = false;
            }
        }
    }
    isBodyNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const slotName = element.getAttribute("slot");
            if (slotName) {
                return false;
            }
            if (this.isToolCallDataNode(element)) {
                return this.toolCallDataHasContent(element);
            }
            return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.textContent?.trim());
        }
        return false;
    }
    updateStepParity() {
        if (this.stepNumber > 0) {
            const parity = this.stepNumber % 2 === 0 ? "even" : "odd";
            this.setAttribute("data-step-parity", parity);
        }
        else {
            this.removeAttribute("data-step-parity");
        }
    }
    isToolCallDataNode(element) {
        return element.tagName.toLowerCase() === "cds-aichat-tool-call-data";
    }
    toolCallDataHasContent(element) {
        const toolName = element.toolName ??
            element.getAttribute("tool-name");
        if (toolName?.toString().trim()) {
            return true;
        }
        return Array.from(element.childNodes).some((child) => this.hasChildContent(child));
    }
    hasChildContent(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.textContent?.trim());
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (this.isToolCallDataNode(element)) {
                return this.toolCallDataHasContent(element);
            }
            return Array.from(element.childNodes).some((child) => this.hasChildContent(child));
        }
        return false;
    }
    handleBodySlotChange(event) {
        const slot = event.target;
        const nodes = slot.assignedNodes({ flatten: true });
        this.evaluateBodyContent(nodes);
    }
    handleToggleRequest(nextState = !this.open) {
        const detail = { open: nextState };
        const init = { bubbles: true, cancelable: true, composed: true, detail };
        const canToggle = this.dispatchEvent(new CustomEvent(`chain-of-thought-step-beingtoggled`, init));
        if (!canToggle) {
            return;
        }
        if (!this.controlled) {
            this.open = nextState;
        }
        this.dispatchEvent(new CustomEvent(`chain-of-thought-step-toggled`, init));
    }
    handleButtonClick() {
        if (!this.hasBodyContent) {
            return;
        }
        this.handleToggleRequest(!this.open);
    }
    handleButtonKeydown(event) {
        if (!this.open) {
            return;
        }
        if (event.key === "Escape" || event.key === "Esc") {
            event.stopPropagation();
            this.handleToggleRequest(false);
        }
    }
    focus(options) {
        const trigger = this.getTriggerElement();
        if (trigger) {
            trigger.focus(options);
            return;
        }
        super.focus(options);
    }
    getHeaderTitle() {
        if (this.labelText) {
            return this.labelText;
        }
        if (this.stepNumber > 0) {
            const formattedNumber = numberFormatter.format(this.stepNumber);
            return `${formattedNumber}: ${this.title || ""}`;
        }
        return this.title;
    }
    renderStatusIcon() {
        switch (this.status) {
            case ChainOfThoughtStepStatus.PROCESSING:
                return html `<cds-custom-inline-loading
          status="active"
          aria-label="${this.statusProcessingLabelText}"
        ></cds-custom-inline-loading>`;
            case ChainOfThoughtStepStatus.FAILURE:
                return html `<span
          class="${statusClass}--${ChainOfThoughtStepStatus.FAILURE}"
          aria-label="${this.statusFailedLabelText}"
          >${iconLoader(ErrorFilled16)}</span
        >`;
            default:
                return html `<span
          class="${statusClass}--${ChainOfThoughtStepStatus.SUCCESS}"
          aria-label="${this.statusSucceededLabelText}"
          >${iconLoader(CheckmarkFilled16)}</span
        >`;
        }
    }
    renderInteractiveHeader() {
        const headerTitle = this.getHeaderTitle();
        return html `
      <button
        id=${this.headerId}
        type="button"
        part="expando"
        class="${baseClass}-header"
        aria-expanded="${String(this.open)}"
        aria-controls="${this.contentId}"
        @click=${this.handleButtonClick}
        @keydown=${this.handleButtonKeydown}
      >
        <span
          class="${baseClass}-header-chevron"
          ?data-open=${this.open}
          aria-hidden="true"
        >
          ${iconLoader(ChevronRight16)}
        </span>
        <span class="${baseClass}-header-title">
          <slot name="title">${headerTitle}</slot>
        </span>
        <span class="${statusClass}" aria-hidden="false"
          >${this.renderStatusIcon()}</span
        >
      </button>
    `;
    }
    renderStaticHeader() {
        const headerTitle = this.getHeaderTitle();
        return html `
      <div class="${baseClass}-static" id=${this.headerId} part="expando">
        <span class="${baseClass}-header-chevron" aria-hidden="true"
          >&mdash;</span
        >
        <span class="${baseClass}-header-title">
          <slot name="title">${headerTitle}</slot>
        </span>
        <span class="${statusClass}" aria-hidden="true">
          ${this.renderStatusIcon()}
        </span>
      </div>
    `;
    }
    renderPanel() {
        const isHidden = !this.hasBodyContent;
        return html `
      <div
        id=${this.contentId}
        class="${baseClass}-content"
        part="wrapper"
        aria-hidden="${this.open && !isHidden ? "false" : "true"}"
        role=${ifDefined(!isHidden ? "region" : undefined)}
        aria-labelledby=${ifDefined(!isHidden ? this.headerId : undefined)}
        ?hidden=${isHidden || !this.open}
      >
        <div
          class="${prefix}--chain-of-thought-item"
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
    render() {
        const classes = classMap({
            [baseClass]: true,
            [`${baseClass}--open`]: this.open && this.hasBodyContent,
            [`${baseClass}--static`]: !this.hasBodyContent,
        });
        return html `<div class=${classes}>
      ${this.hasBodyContent
            ? this.renderInteractiveHeader()
            : this.renderStaticHeader()}
      ${this.renderPanel()}
    </div>`;
    }
};
CDSAIChatChainOfThoughtStep.styles = styles;
__decorate([
    property({ type: String, attribute: "title" })
], CDSAIChatChainOfThoughtStep.prototype, "title", void 0);
__decorate([
    property({ type: Number, attribute: "step-number", reflect: true })
], CDSAIChatChainOfThoughtStep.prototype, "stepNumber", void 0);
__decorate([
    property({ type: String, attribute: "label-text" })
], CDSAIChatChainOfThoughtStep.prototype, "labelText", void 0);
__decorate([
    property({ type: String, attribute: "status" })
], CDSAIChatChainOfThoughtStep.prototype, "status", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "open" })
], CDSAIChatChainOfThoughtStep.prototype, "open", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "controlled" })
], CDSAIChatChainOfThoughtStep.prototype, "controlled", void 0);
__decorate([
    property({
        type: String,
        attribute: "status-succeeded-label-text",
        reflect: true,
    })
], CDSAIChatChainOfThoughtStep.prototype, "statusSucceededLabelText", void 0);
__decorate([
    property({
        type: String,
        attribute: "status-failed-label-text",
        reflect: true,
    })
], CDSAIChatChainOfThoughtStep.prototype, "statusFailedLabelText", void 0);
__decorate([
    property({
        type: String,
        attribute: "status-processing-label-text",
        reflect: true,
    })
], CDSAIChatChainOfThoughtStep.prototype, "statusProcessingLabelText", void 0);
__decorate([
    state()
], CDSAIChatChainOfThoughtStep.prototype, "hasBodyContent", void 0);
CDSAIChatChainOfThoughtStep = __decorate([
    carbonElement("cds-aichat-chain-of-thought-step")
], CDSAIChatChainOfThoughtStep);
var CDSAIChatChainOfThoughtStep_default = CDSAIChatChainOfThoughtStep;

export { CDSAIChatChainOfThoughtStep, CDSAIChatChainOfThoughtStep_default as default };
//# sourceMappingURL=chain-of-thought-step.js.map
