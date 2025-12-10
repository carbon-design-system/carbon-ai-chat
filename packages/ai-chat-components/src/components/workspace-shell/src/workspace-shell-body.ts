/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
// @ts-ignore
import styles from "./workspace-shell.scss?lit";

/**
 * Workspace Shell Body.
 *
 * @element cds-aichat-workspace-shell-body
 *
 */
@customElement("cds-aichat-workspace-shell-body")
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
