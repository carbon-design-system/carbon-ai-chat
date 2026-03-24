/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronLeft16 from "@carbon/icons/es/chevron--left/16.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History header.
 *
 * @element cds-aichat-history-header
 *
 */
@carbonElement(`${prefix}-history-header`)
class CDSAIChatHistoryHeader extends LitElement {
  /**
   * Sets default slot value to header
   */
  @property({ type: String, reflect: true })
  slot = "header";

  /**
   * Header title
   */
  @property({ type: String, reflect: true, attribute: "header-title" })
  headerTitle = "Conversations";

  /**
   * Label for close chat history button.
   */
  @property({ type: String, attribute: "close-button-label" })
  closeButtonLabel = "Close chat history";

  /**
   * Render close chat history panel button
   */
  @property({ type: Boolean, attribute: "show-close-action", reflect: true })
  showCloseAction = false;

  /**
   * Handles close button click event
   */
  _handleCloseButtonClick = () => {
    this.dispatchEvent(
      new CustomEvent("history-header-close-click", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const {
      closeButtonLabel,
      showCloseAction,
      headerTitle,
      _handleCloseButtonClick: handleCloseButtonClick,
    } = this;

    return html`
      ${showCloseAction
        ? html`<cds-icon-button
            class="${prefix}--history-header__close-button"
            kind="ghost"
            align="right"
            @click=${handleCloseButtonClick}
          >
            ${iconLoader(ChevronLeft16, { slot: "icon" })}
            <span slot="tooltip-content">${closeButtonLabel}</span>
          </cds-icon-button>`
        : nothing}
      <span class="${prefix}--history-header__title">${headerTitle}</span>
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryHeader };
export default CDSAIChatHistoryHeader;
