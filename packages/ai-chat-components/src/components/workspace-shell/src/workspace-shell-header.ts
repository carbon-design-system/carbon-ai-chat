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
import styles from "./workspace-shell-header.scss?lit";
import prefix from "../../../globals/settings.js";

/**
 * Workspace Shell Header.
 *
 * @element cds-aichat-workspace-shell-header
 *
 * @slot header-description - Represents the description area in the Header.
 * @slot header-action - Represents the action area in the workspace.
 *
 */
@customElement("cds-aichat-workspace-shell-header")
class CDSAIChatWorkspaceShellHeader extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "header";

  /**
   * Sets the Title text for the Toolbar Component
   */
  @property({ type: String, attribute: "title-text" })
  titleText;

  /**
   * Sets the subTitle text for the Toolbar Component
   */
  @property({ type: String, attribute: "subtitle-text" })
  subTitleText;

  render() {
    const { titleText, subTitleText } = this;
    return html`
      <div class="${prefix}-workspace-shell__header-content">
        ${titleText &&
        html`
          <h1 class="${prefix}-workspace-shell__header-title">${titleText}</h1>
        `}
        ${subTitleText &&
        html`
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
}

export { CDSAIChatWorkspaceShellHeader };
export default CDSAIChatWorkspaceShellHeader;
