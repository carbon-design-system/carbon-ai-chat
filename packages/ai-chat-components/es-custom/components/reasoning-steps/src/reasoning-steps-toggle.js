/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { reasoningStepsToggleTemplate } from './reasoning-steps-toggle.template.js';
import styles from './reasoning-steps-toggle.scss.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
let CDSAIChatReasoningStepsToggle = class CDSAIChatReasoningStepsToggle extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Indicates if the reasoning steps panel is open.
         */
        this.open = false;
        /**
         * Label text when the panel is open.
         */
        this.openLabelText = "Hide reasoning steps";
        /**
         * Label text when the panel is closed.
         */
        this.closedLabelText = "Show reasoning steps";
        /**
         * Whether the control should be disabled.
         */
        this.disabled = false;
    }
    handleToggleClick() {
        if (this.disabled) {
            return;
        }
        const nextOpen = !this.open;
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent("reasoning-steps-toggle", {
            detail: { open: nextOpen },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        return reasoningStepsToggleTemplate(this);
    }
};
CDSAIChatReasoningStepsToggle.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "open", reflect: true })
], CDSAIChatReasoningStepsToggle.prototype, "open", void 0);
__decorate([
    property({ type: String, attribute: "open-label-text", reflect: true })
], CDSAIChatReasoningStepsToggle.prototype, "openLabelText", void 0);
__decorate([
    property({ type: String, attribute: "closed-label-text", reflect: true })
], CDSAIChatReasoningStepsToggle.prototype, "closedLabelText", void 0);
__decorate([
    property({ type: String, attribute: "panel-id", reflect: true })
], CDSAIChatReasoningStepsToggle.prototype, "panelID", void 0);
__decorate([
    property({ type: Boolean, attribute: "disabled", reflect: true })
], CDSAIChatReasoningStepsToggle.prototype, "disabled", void 0);
CDSAIChatReasoningStepsToggle = __decorate([
    carbonElement("cds-aichat-reasoning-steps-toggle")
], CDSAIChatReasoningStepsToggle);
var CDSAIChatReasoningStepsToggle$1 = CDSAIChatReasoningStepsToggle;

export { CDSAIChatReasoningStepsToggle, CDSAIChatReasoningStepsToggle$1 as default };
//# sourceMappingURL=reasoning-steps-toggle.js.map
