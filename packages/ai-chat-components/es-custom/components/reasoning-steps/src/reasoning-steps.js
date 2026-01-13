/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './reasoning-steps.scss.js';
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
const baseClass = `${prefix}--reasoning-steps`;
const stepSelector = `${prefix}-reasoning-step`;
let CDSAIChatReasoningSteps = class CDSAIChatReasoningSteps extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.controlled = false;
    }
    connectedCallback() {
        if (!this.hasAttribute("role")) {
            this.setAttribute("role", "list");
        }
        super.connectedCallback();
    }
    updated(changedProperties) {
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
    get steps() {
        return this.querySelectorAll(stepSelector);
    }
    propagateOpen() {
        this.steps.forEach((step) => {
            if (this.open) {
                step.removeAttribute("inert");
            }
            else {
                step.setAttribute("inert", "");
            }
        });
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
        return html `
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
};
CDSAIChatReasoningSteps.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "open", reflect: true })
], CDSAIChatReasoningSteps.prototype, "open", void 0);
__decorate([
    property({ type: Boolean, attribute: "controlled", reflect: true })
], CDSAIChatReasoningSteps.prototype, "controlled", void 0);
CDSAIChatReasoningSteps = __decorate([
    carbonElement("cds-aichat-reasoning-steps")
], CDSAIChatReasoningSteps);
var CDSAIChatReasoningSteps$1 = CDSAIChatReasoningSteps;

export { CDSAIChatReasoningSteps, CDSAIChatReasoningSteps$1 as default };
//# sourceMappingURL=reasoning-steps.js.map
