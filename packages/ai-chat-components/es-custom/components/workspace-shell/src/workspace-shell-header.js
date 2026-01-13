/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import styles from './workspace-shell-header.scss.js';
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
 * Workspace Shell Header.
 *
 * @element cds-aichat-workspace-shell-header
 *
 * @slot header-description - Represents the description area in the Header.
 * @slot header-action - Represents the action area in the workspace.
 *
 */
let CDSAIChatWorkspaceShellHeader = class CDSAIChatWorkspaceShellHeader extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Sets default slot value to toolbar
         */
        this.slot = "header";
    }
    render() {
        const { titleText, subTitleText } = this;
        return html `
      <div class="${prefix}-workspace-shell__header-content">
        ${titleText &&
            html `
          <h1 class="${prefix}-workspace-shell__header-title">${titleText}</h1>
        `}
        ${subTitleText &&
            html `
          <h3 class="${prefix}-workspace-shell__header-sub-title">
            ${subTitleText}
          </h3>
        `}
        <slot name="header-description"></slot>
      </div>
      <div class="${prefix}-workspace-shell__header-action">
        <slot name="header-action"></slot>
      </div>
    `;
    }
};
CDSAIChatWorkspaceShellHeader.styles = styles;
__decorate([
    property({ type: String, reflect: true })
], CDSAIChatWorkspaceShellHeader.prototype, "slot", void 0);
__decorate([
    property({ type: String, attribute: "title-text" })
], CDSAIChatWorkspaceShellHeader.prototype, "titleText", void 0);
__decorate([
    property({ type: String, attribute: "subtitle-text" })
], CDSAIChatWorkspaceShellHeader.prototype, "subTitleText", void 0);
CDSAIChatWorkspaceShellHeader = __decorate([
    carbonElement("cds-aichat-workspace-shell-header")
], CDSAIChatWorkspaceShellHeader);
var CDSAIChatWorkspaceShellHeader$1 = CDSAIChatWorkspaceShellHeader;

export { CDSAIChatWorkspaceShellHeader, CDSAIChatWorkspaceShellHeader$1 as default };
//# sourceMappingURL=workspace-shell-header.js.map
