/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
// @ts-ignore
import styles from "./workspace-shell.scss?lit";
import prefix from "../../../globals/settings.js";

@customElement(`${prefix}-workspace-shell`)
class CDSAIChatWorkspaceShell extends LitElement {
  static styles = styles;
  render() {
    return html`
      <slot name="toolbar"></slot>
      <slot name="header"></slot>
      <div class="cds-aichat-workspace-shell__body">
        <slot name="body"></slot>
      </div>
      <slot name="footer"></slot>
    `;
  }

  closeWorkspaceShell = () => {
    console.log("closes the shell");
  };
}

export default CDSAIChatWorkspaceShell;
