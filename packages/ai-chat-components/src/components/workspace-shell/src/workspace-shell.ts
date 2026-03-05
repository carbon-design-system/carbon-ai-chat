/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import styles from "./workspace-shell.scss?lit";

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
@carbonElement(`${prefix}-workspace-shell`)
class CDSAIChatWorkspaceShell extends LitElement {
  static styles = styles;

  @property({ type: Boolean, reflect: true, attribute: "header-open" })
  headerOpen = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("workspace-header-toggle", this._handleHeaderToggle);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "workspace-header-toggle",
      this._handleHeaderToggle,
    );
  }

  private _handleHeaderToggle = (event: Event) => {
    const customEvent = event as CustomEvent<{ open: boolean }>;
    this.headerOpen = customEvent.detail.open;
  };

  render() {
    return html`
      <slot name="toolbar"></slot>
      <slot name="notification"></slot>
      <slot name="header"></slot>
      </div>
      <div class="body">
        <slot name="body"></slot>
      </div>
      <slot name="footer"></slot>
  </div>
    `;
  }
}

export { CDSAIChatWorkspaceShell };
export default CDSAIChatWorkspaceShell;
