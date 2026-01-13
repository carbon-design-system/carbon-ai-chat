/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import styles from './workspace-shell.scss.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Workspace Shell.
 *
 * @element cds-aichat-workspace-shell
 * @slot toolbar - Represents the toolbar area of the workspace.
 * @slot header - Represents the header section, containing title, subtitle and actions.
 * @slot notification - Area for displaying workspace notifications.
 * @slot body - The main content area of the workspace.
 * @slot footer - Represents the footer section, usually containing action buttons.
 *
 */
let CDSAIChatWorkspaceShell = class CDSAIChatWorkspaceShell extends LitElement {
    constructor() {
        super(...arguments);
        this.closeWorkspaceShell = () => {
            console.log("closes the shell");
        };
    }
    render() {
        return html `
      <slot name="toolbar"></slot>
      <slot name="notification"></slot>
      <slot name="header"></slot>
      <slot name="body"></slot>
      <slot name="footer"></slot>
    `;
    }
};
CDSAIChatWorkspaceShell.styles = styles;
CDSAIChatWorkspaceShell = __decorate([
    carbonElement("cds-aichat-workspace-shell")
], CDSAIChatWorkspaceShell);
var CDSAIChatWorkspaceShell$1 = CDSAIChatWorkspaceShell;

export { CDSAIChatWorkspaceShell, CDSAIChatWorkspaceShell$1 as default };
//# sourceMappingURL=workspace-shell.js.map
