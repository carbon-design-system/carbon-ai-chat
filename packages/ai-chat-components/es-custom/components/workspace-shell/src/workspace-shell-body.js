/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './workspace-shell.scss.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Workspace Shell Body.
 *
 * @element cds-aichat-workspace-shell-body
 *
 */
let CDSAIChatWorkspaceShellBody = class CDSAIChatWorkspaceShellBody extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Sets default slot value to body
         */
        this.slot = "body";
    }
    render() {
        return html ` <slot></slot> `;
    }
};
CDSAIChatWorkspaceShellBody.styles = styles;
__decorate([
    property({ type: String, reflect: true })
], CDSAIChatWorkspaceShellBody.prototype, "slot", void 0);
CDSAIChatWorkspaceShellBody = __decorate([
    carbonElement("cds-aichat-workspace-shell-body")
], CDSAIChatWorkspaceShellBody);
var CDSAIChatWorkspaceShellBody$1 = CDSAIChatWorkspaceShellBody;

export { CDSAIChatWorkspaceShellBody, CDSAIChatWorkspaceShellBody$1 as default };
//# sourceMappingURL=workspace-shell-body.js.map
