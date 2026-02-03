/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronLeft20 from "@carbon/icons/es/chevron--left/20.js";
import RightPanelClose20 from "@carbon/icons/es/right-panel--close/20.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History header.
 *
 * @element cds-aichat-history-header
 *
 */
@carbonElement(`${prefix}-history-header`)
export class CDSHistoryHeader extends LitElement {
  /**
   * Sets default slot value to header
   */
  @property({ type: String, reflect: true })
  slot = "header";

  /**
   * Header title
   */
  @property({ type: String, reflect: true })
  title = "Conversations";

  /**
   * Label for close chat history button.
   */
  @property({ type: String, attribute: "close-button-label" })
  closeButtonLabel = "Close chat history";

  /**
   * Label for expanding chat history panel button.
   */
  @property({ type: String, attribute: "expand-chat-label" })
  expandChatLabel = "Expand chat panel";

  /**
   * Render close chat history panel button
   */
  @property({ type: Boolean, attribute: "show-close-action", reflect: true })
  showCloseAction = true;

  render() {
    const { closeButtonLabel, expandChatLabel, showCloseAction, title } = this;

    return html` ${showCloseAction &&
      html`<cds-icon-button
        class="${prefix}--history-header__close-button"
        kind="ghost"
      >
        ${iconLoader(ChevronLeft20, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${closeButtonLabel}</span>
      </cds-icon-button>`}
      <span class="${prefix}--history-header__title">${title}</span>
      <cds-icon-button kind="ghost">
        ${iconLoader(RightPanelClose20, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${expandChatLabel}</span>
      </cds-icon-button>`;
  }

  static styles = styles;
}

export default CDSHistoryHeader;
