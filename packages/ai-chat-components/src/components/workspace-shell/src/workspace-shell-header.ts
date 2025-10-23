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

@customElement(`${prefix}-workspace-shell-header`)
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
      <div>
        <h1 class="cds-aichat-workspace-shell__header-title">${titleText}</h1>
        <h3 class="cds-aichat-workspace-shell__header-sub-title">
          ${subTitleText}
        </h3>
        <slot name="header-description"></slot>
      </div>
      <slot name="header-actions"></slot>
    `;
  }
}

export default CDSAIChatWorkspaceShellHeader;
