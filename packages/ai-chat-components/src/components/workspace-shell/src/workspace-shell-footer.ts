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
import "@carbon/web-components/es/components/button/button.js";
// @ts-ignore
import styles from "./workspace-shell.scss?lit";
import prefix from "../../../globals/settings.js";

/**
 * Workspace Shell Footer.
 *
 * @element cds-aichat-workspace-shell-footer
 *
 * @slot footer-action - Represents the action area in the Footer.
 *
 */
@customElement(`${prefix}-workspace-shell-footer`)
class CDSAIChatWorkspaceShellFooter extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "footer";

  render() {
    return html` <slot name="footer-action"></slot> `;
  }
}

export default CDSAIChatWorkspaceShellFooter;
