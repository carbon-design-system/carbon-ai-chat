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
import { tryFocus } from "../../../globals/utils/focus-utils.js";

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

  /**
   * Reference to the history panel item element that triggered the delete action.
   * Used to restore focus to the next/previous item after deletion.
   */
  @property({ type: Object })
  triggeringElement?: HTMLElement;

  @query('cds-aichat-button[kind="danger"]')
  _deleteButton;

  // auto focus on delete button when delete panel first renders.
  async firstUpdated() {
    await this.updateComplete;
    this._deleteButton?.shadowRoot?.querySelector("button").focus();
  }

  /**
   * Finds the next or previous focusable history panel item.
   * Prioritizes the next item, falls back to previous if this was the last item.
   *
   * @returns The next/previous history panel item element, or null if none found
   */
  private _findNextFocusableItem(): HTMLElement | null {
    if (!this.triggeringElement) {
      return null;
    }

    // Find all history panel items in the same container
    const container = this.triggeringElement.closest(
      `${prefix}-history-panel-items`,
    );

    if (!container) {
      // Try alternative: search from the root document
      const historyShell = document.querySelector(`${prefix}-history-shell`);

      if (historyShell) {
        const allItems = Array.from(
          historyShell.querySelectorAll(`${prefix}-history-panel-item`),
        ) as HTMLElement[];

        const currentIndex = allItems.indexOf(this.triggeringElement);

        if (currentIndex !== -1) {
          const nextItem =
            allItems[currentIndex + 1] || allItems[currentIndex - 1] || null;
          return nextItem;
        }
      }

      return null;
    }

    const allItems = Array.from(
      container.querySelectorAll(`${prefix}-history-panel-item`),
    ) as HTMLElement[];

    const currentIndex = allItems.indexOf(this.triggeringElement);

    if (currentIndex === -1) {
      return null;
    }

    const nextItem =
      allItems[currentIndex + 1] || allItems[currentIndex - 1] || null;

    // Try next item first, then previous, then null
    return nextItem;
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
   * Handles delete button click event.
   * Automatically restores focus to the next/previous history item after deletion.
   */
  _handleDeleteClick = () => {
    // Find the next item to focus BEFORE dispatching the event
    // (because the triggering element will be removed from DOM after deletion)
    const nextFocusTarget = this._findNextFocusableItem();

    this.dispatchEvent(
      new CustomEvent("history-delete-confirm", {
        bubbles: true,
        composed: true,
        detail: {
          triggeringElement: this.triggeringElement,
          nextFocusTarget: nextFocusTarget,
        },
      }),
    );

    // Restore focus after a microtask to allow DOM updates
    if (nextFocusTarget) {
      requestAnimationFrame(() => {
        // Try the utility first
        const focused = tryFocus(nextFocusTarget);

        // If tryFocus didn't work, manually focus the button in shadow DOM
        if (!focused) {
          const button = nextFocusTarget.shadowRoot?.querySelector("button");
          if (button) {
            button.focus();
          }
        }
      });
    }
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
