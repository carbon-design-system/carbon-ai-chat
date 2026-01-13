/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './chain-of-thought.scss.js';
import prefix from '../../../globals/settings.js';
import { uuid } from '../../../globals/utils/uuid.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const stepSelector = `${prefix}-chain-of-thought-step`;
let CDSAIChatChainOfThought = class CDSAIChatChainOfThought extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Indicates if the details panel for the chain of thought is open.
         */
        this.open = false;
        /**
         * When true, each child step should be fully controlled by the host.
         */
        this.controlled = false;
        /**
         * ID of the content panel. Useful for wiring to an external toggle.
         */
        this.panelId = `${prefix}-chain-of-thought-panel-id-${uuid()}`;
    }
    connectedCallback() {
        if (!this.hasAttribute("role")) {
            this.setAttribute("role", "list");
        }
        this.addEventListener("chain-of-thought-step-toggled", this.handleStepToggle);
        super.connectedCallback();
    }
    disconnectedCallback() {
        this.removeEventListener("chain-of-thought-step-toggled", this.handleStepToggle);
        super.disconnectedCallback();
    }
    get steps() {
        return this.querySelectorAll(stepSelector);
    }
    updated(changedProperties) {
        if (changedProperties.has("controlled")) {
            this.propagateControlled();
        }
        if (changedProperties.has("open") &&
            changedProperties.get("open") !== undefined) {
            this.dispatchToggleEvent();
        }
    }
    handleStepToggle(event) {
        const { detail, target } = event;
        this.onStepToggle?.(Boolean(detail?.open), target);
    }
    propagateControlled() {
        this.steps.forEach((step) => {
            if (this.controlled) {
                step.setAttribute("data-parent-controlled", "");
                step.setAttribute("controlled", "");
            }
            else if (step.hasAttribute("data-parent-controlled")) {
                step.removeAttribute("data-parent-controlled");
                step.removeAttribute("controlled");
            }
        });
    }
    dispatchToggleEvent() {
        const detail = {
            open: this.open,
            panelId: this.panelId,
        };
        this.dispatchEvent(new CustomEvent("chain-of-thought-toggled", {
            detail,
            bubbles: true,
            composed: true,
        }));
        const panel = this.shadowRoot?.getElementById(this.panelId) ?? this;
        this.onToggle?.(this.open, panel);
    }
    render() {
        return html `
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
};
CDSAIChatChainOfThought.styles = styles;
__decorate([
    property({ type: Boolean, reflect: true })
], CDSAIChatChainOfThought.prototype, "open", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], CDSAIChatChainOfThought.prototype, "controlled", void 0);
__decorate([
    property({ type: String, attribute: "panel-id", reflect: true })
], CDSAIChatChainOfThought.prototype, "panelId", void 0);
__decorate([
    property({ type: Function, attribute: false })
], CDSAIChatChainOfThought.prototype, "onToggle", void 0);
__decorate([
    property({ type: Function, attribute: false })
], CDSAIChatChainOfThought.prototype, "onStepToggle", void 0);
CDSAIChatChainOfThought = __decorate([
    carbonElement("cds-aichat-chain-of-thought")
], CDSAIChatChainOfThought);
var CDSAIChatChainOfThought$1 = CDSAIChatChainOfThought;

export { CDSAIChatChainOfThought, CDSAIChatChainOfThought$1 as default };
//# sourceMappingURL=chain-of-thought.js.map
