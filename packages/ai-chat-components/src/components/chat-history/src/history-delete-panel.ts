/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import prefix from "../../../globals/settings.js";
import { property, query } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import "../../chat-button/index.js";
import TrashCan16 from "@carbon/icons/es/trash-can/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History delete chat panel.
 *
 * @element cds-aichat-history-delete-panel
 *
 */
@carbonElement(`${prefix}-history-delete-panel`)
class CDSAIChatHistoryDeletePanel extends LitElement {
  @property({ type: String, attribute: "cancel-text", reflect: true })
  cancelText = "Cancel";

  @property({ type: String, attribute: "delete-text", reflect: true })
  deleteText = "Delete";

  @query('cds-aichat-button[kind="danger"]')
  _deleteButton;

  // auto focus on delete button when delete panel first renders.
  async firstUpdated() {
    await this.updateComplete;
    this._deleteButton?.shadowRoot?.querySelector("button").focus();
  }

  /**
   * Handles cancel button click event
   */
  _handleCancelClick = () => {
    this.dispatchEvent(
      new CustomEvent("history-delete-cancel", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  /**
   * Handles delete button click event
   */
  _handleDeleteClick = () => {
    this.dispatchEvent(
      new CustomEvent("history-delete-confirm", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const {
      cancelText,
      deleteText,
      _handleCancelClick: handleCancelClick,
      _handleDeleteClick: handleDeleteClick,
    } = this;

    return html`
      <div aria-live="polite" class="${prefix}--history-delete-panel__content">
        <h1><slot name="title">Confirm Delete</slot></h1>
        <span
          ><slot name="description"
            >This conversation will be permanently deleted.</slot
          ></span
        >
        <div class="${prefix}--history-delete-panel__actions">
          <cds-aichat-button
            size="sm"
            kind="tertiary"
            @click=${handleCancelClick}
            >${cancelText}</cds-aichat-button
          >
          <cds-aichat-button size="sm" kind="danger" @click=${handleDeleteClick}
            >${deleteText}
            ${iconLoader(TrashCan16, { slot: "icon" })}</cds-aichat-button
          >
        </div>
      </div>
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryDeletePanel };
export default CDSAIChatHistoryDeletePanel;
