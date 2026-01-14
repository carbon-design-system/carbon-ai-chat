/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
// @ts-ignore
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

  render() {
    return html`
      <slot name="toolbar"></slot>
      <slot name="notification"></slot>
      <slot name="header"></slot>
      <slot name="body"></slot>
      <slot name="footer"></slot>
    `;
  }

  closeWorkspaceShell = () => {
    console.log("closes the shell");
  };
}

export { CDSAIChatWorkspaceShell };
export default CDSAIChatWorkspaceShell;
