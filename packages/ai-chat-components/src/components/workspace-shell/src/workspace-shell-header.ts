/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property, query } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import styles from "./workspace-shell-header.scss?lit";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import "../../truncated-text/index.js";

/**
 * Workspace Shell Header.
 *
 * @element cds-aichat-workspace-shell-header
 *
 * @slot header-description - Represents the description area in the Header.
 * @slot header-action - Represents the action area in the workspace.
 *
 * @fires workspace-header-toggle - Fired when the details element is toggled
 */
@carbonElement(`${prefix}-workspace-shell-header`)
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

  @query("details")
  private _detailsElement!: HTMLDetailsElement;

  firstUpdated() {
    if (this._detailsElement) {
      this._detailsElement.addEventListener("toggle", this._handleToggle);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._detailsElement) {
      this._detailsElement.removeEventListener("toggle", this._handleToggle);
    }
  }

  private _handleToggle = () => {
    const isOpen = this._detailsElement?.open || false;
    this.dispatchEvent(
      new CustomEvent("workspace-header-toggle", {
        detail: { open: isOpen },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const { titleText, subTitleText } = this;
    return html`
      <details
        class="${prefix}-workspace-shell__header-details ${prefix}-workspace-shell__header-content"
      >
        ${titleText &&
        html`
          <summary class="${prefix}-workspace-shell__header-summary">
            <h1 class="${prefix}-workspace-shell__header-title">
              <cds-aichat-truncated-text
                value=${titleText}
                lines="1"
                type="tooltip"
              ></cds-aichat-truncated-text>
            </h1>
            <span class="${prefix}-workspace-shell__header-chevron">
              ${iconLoader(ChevronDown16)}
            </span>
          </summary>
        `}
        <div class="${prefix}-workspace-shell__header-content">
          ${subTitleText &&
          html`
            <h3 class="${prefix}-workspace-shell__header-sub-title">
              ${subTitleText}
            </h3>
          `}
          <slot name="header-description"></slot>
          <slot name="header-action"></slot>
        </div>
      </details>
    `;
  }
}

export { CDSAIChatWorkspaceShellHeader };
export default CDSAIChatWorkspaceShellHeader;
