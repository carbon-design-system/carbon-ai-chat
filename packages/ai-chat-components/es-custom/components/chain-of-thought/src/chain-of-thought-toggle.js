/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import ChevronDown16 from '@carbon/icons/es/chevron--down/16.js';
import styles from './chain-of-thought-toggle.scss.js';
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
let CDSAIChatChainOfThoughtToggle = class CDSAIChatChainOfThoughtToggle extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Indicates if the chain of thought panel is open.
         */
        this.open = false;
        /**
         * Label text when the panel is open.
         */
        this.openLabelText = "Hide chain of thought";
        /**
         * Label text when the panel is closed.
         */
        this.closedLabelText = "Show chain of thought";
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
        this.dispatchEvent(new CustomEvent("chain-of-thought-toggle", {
            detail: { open: nextOpen, panelId: this.panelId },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        const labelText = this.open ? this.openLabelText : this.closedLabelText;
        return html `
      <button
        class="${prefix}--chain-of-thought-button"
        type="button"
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls=${ifDefined(this.panelId)}
        ?disabled=${this.disabled}
        @click=${this.handleToggleClick}
      >
        <span
          class="${prefix}--chain-of-thought-button-chevron"
          aria-hidden="true"
        >
          ${iconLoader(ChevronDown16)}
        </span>
        <span
          class="${prefix}--chain-of-thought-button-label"
          title=${labelText}
        >
          ${labelText}
        </span>
      </button>
    `;
    }
};
CDSAIChatChainOfThoughtToggle.styles = styles;
__decorate([
    property({ type: Boolean, reflect: true })
], CDSAIChatChainOfThoughtToggle.prototype, "open", void 0);
__decorate([
    property({ type: String, attribute: "open-label-text", reflect: true })
], CDSAIChatChainOfThoughtToggle.prototype, "openLabelText", void 0);
__decorate([
    property({ type: String, attribute: "closed-label-text", reflect: true })
], CDSAIChatChainOfThoughtToggle.prototype, "closedLabelText", void 0);
__decorate([
    property({ type: String, attribute: "panel-id", reflect: true })
], CDSAIChatChainOfThoughtToggle.prototype, "panelId", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], CDSAIChatChainOfThoughtToggle.prototype, "disabled", void 0);
CDSAIChatChainOfThoughtToggle = __decorate([
    carbonElement("cds-aichat-chain-of-thought-toggle")
], CDSAIChatChainOfThoughtToggle);
var CDSAIChatChainOfThoughtToggle$1 = CDSAIChatChainOfThoughtToggle;

export { CDSAIChatChainOfThoughtToggle, CDSAIChatChainOfThoughtToggle$1 as default };
//# sourceMappingURL=chain-of-thought-toggle.js.map
