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
import styles from "./workspace-shell.scss?lit";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";

/**
 * Workspace Shell Body.
 *
 * @element cds-aichat-workspace-shell-body
 *
 */
@carbonElement(`${prefix}-workspace-shell-body`)
class CDSAIChatWorkspaceShellBody extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to body
   */
  @property({ type: String, reflect: true })
  slot = "body";

  render() {
    return html` <slot></slot> `;
  }
}

export { CDSAIChatWorkspaceShellBody };
export default CDSAIChatWorkspaceShellBody;
