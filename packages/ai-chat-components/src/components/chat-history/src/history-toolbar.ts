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

import "@carbon/web-components/es/components/search/search.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import AddComment16 from "@carbon/icons/es/add-comment/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History Toolbar.
 *
 * @element cds-aichat-history-toolbar
 *
 */
@carbonElement(`${prefix}-history-toolbar`)
class CDSAIChatHistoryToolbar extends LitElement {
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "toolbar";

  /**
   * Label for new chat button.
   */
  @property({ type: String, attribute: "new-chat-label" })
  newChatLabel = "New chat";

  /**
   * `true` to remove search from toolbar.
   */
  @property({ type: Boolean, attribute: "search-off", reflect: true })
  searchOff;

  /**
   * Handles new chat button click event
   */
  _handleNewChatButtonClick = () => {
    this.dispatchEvent(
      new CustomEvent("chat-history-new-chat-click", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  /**
   * Handle keydown event on new chat button
   * @param event
   */
  _handleNewChatButtonKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      this._handleNewChatButtonClick();
    }
  };

  render() {
    const {
      newChatLabel,
      searchOff,
      _handleNewChatButtonClick: handleNewChatButtonClick,
      _handleNewChatButtonKeyDown: handleNewChatButtonKeyDown,
    } = this;

    return html` <slot name="actions-start"></slot>
      ${!searchOff ? html`<cds-search></cds-search>` : nothing}
      <slot name="actions-end"></slot>
      <cds-icon-button
        align="top-right"
        @click=${handleNewChatButtonClick}
        @keydown=${handleNewChatButtonKeyDown}
      >
        ${iconLoader(AddComment16, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${newChatLabel}</span>
      </cds-icon-button>`;
  }

  static styles = styles;
}

export { CDSAIChatHistoryToolbar };
export default CDSAIChatHistoryToolbar;
