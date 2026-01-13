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
import { feedbackButtonsElementTemplate } from './feedback-buttons.template.js';
import styles from './feedback-buttons.scss.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
let CDSAIChatFeedbackButtons = class CDSAIChatFeedbackButtons extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Indicates if the details panel for the positive feedback is open.
         */
        this.isPositiveOpen = false;
        /**
         * Indicates if the details panel for the negative feedback is open.
         */
        this.isNegativeOpen = false;
        /**
         * Indicates if the positive feedback button should shown as selected.
         */
        this.isPositiveSelected = false;
        /**
         * Indicates if the positive feedback button will be used to show or hide a details panel.
         */
        this.hasPositiveDetails = false;
        /**
         * Indicates if the negative feedback button will be used to show or hide a details panel.
         */
        this.hasNegativeDetails = false;
        /**
         * Indicates if the positive feedback button should shown as selected.
         */
        this.isNegativeSelected = false;
        /**
         * Indicates if the positive feedback button should shown as disabled.
         */
        this.isPositiveDisabled = false;
        /**
         * Indicates if the negative feedback button should shown as disabled.
         */
        this.isNegativeDisabled = false;
    }
    /**
     * Dispatches an event notifying listeners that a button has been clicked.
     */
    handleButtonClick(isPositive) {
        this.dispatchEvent(new CustomEvent("feedback-buttons-click", {
            detail: { isPositive },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        return feedbackButtonsElementTemplate(this);
    }
};
CDSAIChatFeedbackButtons.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "is-positive-open", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isPositiveOpen", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-negative-open", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isNegativeOpen", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-positive-selected", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isPositiveSelected", void 0);
__decorate([
    property({ type: Boolean, attribute: "has-positive-details", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "hasPositiveDetails", void 0);
__decorate([
    property({ type: Boolean, attribute: "has-negative-details", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "hasNegativeDetails", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-negative-selected", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isNegativeSelected", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-positive-disabled", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isPositiveDisabled", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-negative-disabled", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "isNegativeDisabled", void 0);
__decorate([
    property({ type: String, attribute: "positive-label", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "positiveLabel", void 0);
__decorate([
    property({ type: String, attribute: "negative-label", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "negativeLabel", void 0);
__decorate([
    property({ type: String, attribute: "panel-id", reflect: true })
], CDSAIChatFeedbackButtons.prototype, "panelID", void 0);
CDSAIChatFeedbackButtons = __decorate([
    carbonElement("cds-aichat-feedback-buttons")
], CDSAIChatFeedbackButtons);
var CDSAIChatFeedbackButtons$1 = CDSAIChatFeedbackButtons;

export { CDSAIChatFeedbackButtons, CDSAIChatFeedbackButtons$1 as default };
//# sourceMappingURL=feedback-buttons.js.map
