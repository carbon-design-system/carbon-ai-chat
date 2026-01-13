/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { feedbackElementTemplate } from './feedback.template.js';
import styles from './feedback.scss.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * The component for displaying a panel requesting feedback from a user.
 */
let CDSAIChatFeedback = class CDSAIChatFeedback extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Indicates if the feedback details are open.
         */
        this.isOpen = false;
        /**
         * Indicates if the feedback details are readonly.
         */
        this.isReadonly = false;
        /**
         * The title to display in the popup. A default value will be used if no value is provided here.
         */
        this.title = "";
        /**
         * The prompt text to display to the user. A default value will be used if no value is provided here.
         */
        this.prompt = "";
        /**
         * Indicates whether the text area should be shown.
         */
        this.showTextArea = true;
        /**
         * Indicates whether the prompt line should be shown.
         */
        this.showPrompt = true;
        /**
         * Internal saved text values for feedback.
         *
         * @internal
         */
        this._textInput = "";
        /**
         * The current set of selected categories.
         *
         * @internal
         */
        this._selectedCategories = new Set();
    }
    /**
     * Called when the properties of the component have changed.
     */
    updated(changedProperties) {
        if (changedProperties.has("initialValues")) {
            this._setInitialValues(this.initialValues);
        }
    }
    /**
     * Updates the initial values used in the component.
     */
    _setInitialValues(values) {
        if (values) {
            this._textInput = values.text ?? "";
            this._selectedCategories = new Set(values.selectedCategories ?? []);
        }
        else {
            this._textInput = "";
            this._selectedCategories = new Set();
        }
    }
    /**
     * Stores the current value of the text area used to collect feedback.
     */
    _handleTextInput(event) {
        this._textInput = event.currentTarget.value;
    }
    /**
     * Called when the user clicks the submit button.
     */
    _handleSubmit() {
        this.dispatchEvent(new CustomEvent("feedback-submit", {
            detail: {
                text: this._textInput,
                selectedCategories: Array.from(this._selectedCategories),
            },
            bubbles: true,
            composed: true,
        }));
    }
    /**
     * Called then the user clicks the close button.
     */
    _handleCancel() {
        this.dispatchEvent(new CustomEvent("feedback-close", {
            bubbles: true,
            composed: true,
        }));
    }
    /**
     * Called when a category button is clicked.
     */
    _handleCategoryClick(event) {
        if (this.isReadonly) {
            return;
        }
        const button = event.currentTarget;
        const category = button?.getAttribute("data-content");
        if (!category) {
            return;
        }
        const nextSelection = new Set(this._selectedCategories);
        if (nextSelection.has(category)) {
            nextSelection.delete(category);
        }
        else {
            nextSelection.add(category);
        }
        this._selectedCategories = nextSelection;
    }
    render() {
        return feedbackElementTemplate(this);
    }
};
CDSAIChatFeedback.styles = styles;
__decorate([
    property({ type: String, attribute: "class", reflect: true })
], CDSAIChatFeedback.prototype, "class", void 0);
__decorate([
    property({ type: String, attribute: "id", reflect: true })
], CDSAIChatFeedback.prototype, "id", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-open", reflect: true })
], CDSAIChatFeedback.prototype, "isOpen", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-readonly", reflect: true })
], CDSAIChatFeedback.prototype, "isReadonly", void 0);
__decorate([
    property({ type: Object, attribute: "initial-values", reflect: true })
], CDSAIChatFeedback.prototype, "initialValues", void 0);
__decorate([
    property({ type: String, attribute: "title", reflect: true })
], CDSAIChatFeedback.prototype, "title", void 0);
__decorate([
    property({ type: String, attribute: "prompt", reflect: true })
], CDSAIChatFeedback.prototype, "prompt", void 0);
__decorate([
    property({ type: Array, attribute: "categories", reflect: true })
], CDSAIChatFeedback.prototype, "categories", void 0);
__decorate([
    property({ type: String, attribute: "disclaimer", reflect: true })
], CDSAIChatFeedback.prototype, "disclaimer", void 0);
__decorate([
    property({ type: String, attribute: "text-area-placeholder", reflect: true })
], CDSAIChatFeedback.prototype, "placeholder", void 0);
__decorate([
    property({ type: String, attribute: "cancel-label", reflect: true })
], CDSAIChatFeedback.prototype, "cancelLabel", void 0);
__decorate([
    property({ type: String, attribute: "submit-label", reflect: true })
], CDSAIChatFeedback.prototype, "submitLabel", void 0);
__decorate([
    property({ type: Boolean, attribute: "show-text-area", reflect: true })
], CDSAIChatFeedback.prototype, "showTextArea", void 0);
__decorate([
    property({ type: Boolean, attribute: "show-prompt", reflect: true })
], CDSAIChatFeedback.prototype, "showPrompt", void 0);
__decorate([
    state()
], CDSAIChatFeedback.prototype, "_textInput", void 0);
__decorate([
    state()
], CDSAIChatFeedback.prototype, "_selectedCategories", void 0);
CDSAIChatFeedback = __decorate([
    carbonElement("cds-aichat-feedback")
], CDSAIChatFeedback);
var CDSAIChatFeedbackElement = CDSAIChatFeedback;

export { CDSAIChatFeedback, CDSAIChatFeedbackElement as default };
//# sourceMappingURL=feedback.js.map
