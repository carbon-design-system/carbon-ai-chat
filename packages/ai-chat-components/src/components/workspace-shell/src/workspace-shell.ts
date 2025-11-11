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
// @ts-ignore
import lightDomStyles from "./styles.scss?lit";

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
@customElement(`${prefix}-workspace-shell`)
class CDSAIChatWorkspaceShell extends LitElement {
  static styles = styles;

  connectedCallback(): void {
    super.connectedCallback();

    const root = this.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      this.ensureLightDomStyles(root);
    } else {
      console.warn("Unsupported root node type:", root);
    }
  }

  private ensureLightDomStyles(root: Document | ShadowRoot): void {
    const styleId = `${prefix}-tile-container-light-dom-styles`;
    if (root.querySelector(`#${styleId}`)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = lightDomStyles;

    if (root instanceof ShadowRoot) {
      root.appendChild(style);
    } else {
      root.head.appendChild(style);
    }
  }

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

export default CDSAIChatWorkspaceShell;
