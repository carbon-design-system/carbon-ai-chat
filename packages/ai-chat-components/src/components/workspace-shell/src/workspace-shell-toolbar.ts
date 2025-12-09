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
import prefix from "../../../globals/settings.js";

/**
 * Workspace Shell Toolbar.
 *
 * @element cds-aichat-workspace-shell-toolbar
 *
 * @slot toolbar-action - Represents the action area in the Toolbar.
 *
 */
@customElement(`${prefix}-workspace-shell-toolbar`)
class CDSAIChatWorkspaceShellToolbar extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "toolbar";

  /**
   * Sets the Title text for the Toolbar Component
   */
  @property({ type: String, attribute: "title-text" })
  titleText;

  render() {
    const { titleText } = this;
    return html`
      <div class="${prefix}-workspace-shell__toolbar-title">${titleText}</div>
      <div class="${prefix}-workspace-shell__toolbar-action">
        <slot name="toolbar-action"></slot>
      </div>
    `;
  }
}

export default CDSAIChatWorkspaceShellToolbar;
