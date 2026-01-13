/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { state, property } from 'lit/decorators.js';
import '@carbon/web-components/es-custom/components/button/button.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import styles from './workspace-shell-footer.scss.js';
import prefix from '../../../globals/settings.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Workspace Shell Footer.
 * @element cds-aichat-workspace-shell-footer
 * @fires cds-aichat-workspace-shell-footer-clicked - The custom event fired when footer buttons are clicked.
 */
let CDSAIChatWorkspaceShellFooter = class CDSAIChatWorkspaceShellFooter extends LitElement {
    constructor() {
        super(...arguments);
        this._isStacked = false;
        /**
         * Sets default slot value to footer
         */
        this.slot = "footer";
        this.actions = [];
    }
    connectedCallback() {
        super.connectedCallback();
        this.setAttribute("data-rounded", "bottom");
        // Observe parent size changes
        this._ro = new ResizeObserver(() => this._updateStacked());
        if (this.parentElement) {
            this._ro.observe(this.parentElement);
        }
    }
    updated(changedProps) {
        if (changedProps.has("actions")) {
            if (this.actions.length === 3) {
                this.classList.add(`${prefix}-workspace-shell-footer__three-buttons`);
            }
            else {
                this.classList.remove(`${prefix}-workspace-shell-footer__three-buttons`);
            }
        }
        // Sync to host data attribute
        if (this._isStacked) {
            this.setAttribute("data-stacked", "");
        }
        else {
            this.removeAttribute("data-stacked");
        }
    }
    render() {
        const sorted = this._sortActions(this.actions);
        return html `
      ${sorted.map((action) => {
            return html `
          <cds-custom-button
            kind=${action.kind}
            ?disabled=${action.disabled}
            size="2xl"
            @click=${() => this.handleAction(action)}
          >
            ${action.label}
            ${action.icon && iconLoader(action.icon, { slot: "icon" })}
          </cds-custom-button>
        `;
        })}
    `;
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._ro?.disconnect();
    }
    handleAction(action) {
        const init = {
            bubbles: true,
            composed: true,
            detail: action,
        };
        this.dispatchEvent(new CustomEvent(this.constructor
            .eventButtonClick, init));
    }
    _updateStacked() {
        const shouldStack = window.innerWidth < 671;
        if (shouldStack !== this._isStacked) {
            this._isStacked = shouldStack;
            // Force re-render so actions get sorted again
            this.requestUpdate();
        }
    }
    _sortActions(actions) {
        const rank = (action) => {
            const kind = action.kind ?? "primary";
            return ({
                ghost: 1,
                "danger--ghost": 2,
                tertiary: 3,
                danger: 5,
                primary: 6,
            }[kind] ?? 4);
        };
        return [...actions].sort((a, b) => {
            const diff = rank(a) - rank(b);
            return this._isStacked ? -diff : diff;
        });
    }
    /**
     * The name of the custom event fired when footer buttons are clicked.
     */
    static get eventButtonClick() {
        return `${prefix}-workspace-shell-footer-clicked`;
    }
};
CDSAIChatWorkspaceShellFooter.styles = styles;
__decorate([
    state()
], CDSAIChatWorkspaceShellFooter.prototype, "_isStacked", void 0);
__decorate([
    property({ type: String, reflect: true })
], CDSAIChatWorkspaceShellFooter.prototype, "slot", void 0);
__decorate([
    property({ type: Array, reflect: false })
], CDSAIChatWorkspaceShellFooter.prototype, "actions", void 0);
CDSAIChatWorkspaceShellFooter = __decorate([
    carbonElement("cds-aichat-workspace-shell-footer")
], CDSAIChatWorkspaceShellFooter);
var CDSAIChatWorkspaceShellFooter$1 = CDSAIChatWorkspaceShellFooter;

export { CDSAIChatWorkspaceShellFooter, CDSAIChatWorkspaceShellFooter$1 as default };
//# sourceMappingURL=workspace-shell-footer.js.map
