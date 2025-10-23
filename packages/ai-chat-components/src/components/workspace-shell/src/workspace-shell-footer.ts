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

@customElement(`${prefix}-workspace-shell-footer`)
class CDSAIChatWorkspaceShellFooter extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "footer";
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, attribute: "button-one-text" })
  ButtonOneText;
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, attribute: "button-two-text" })
  ButtonTwoText;
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, attribute: "button-three-text" })
  ButtonThreeText;

  render() {
    const { ButtonOneText, ButtonTwoText, ButtonThreeText } = this;
    return html`
      ${ButtonOneText &&
      html` <cds-button kind="primary">${ButtonOneText}</cds-button> `}
      ${ButtonOneText &&
      html` <cds-button kind="secondary">${ButtonTwoText}</cds-button> `}
      ${ButtonOneText &&
      html` <cds-button kind="ghost">${ButtonThreeText}</cds-button> `}
    `;
  }
}

export default CDSAIChatWorkspaceShellFooter;
