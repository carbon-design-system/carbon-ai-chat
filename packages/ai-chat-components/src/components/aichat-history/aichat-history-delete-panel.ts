/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from 'lit';
import { prefix } from '../../globals/settings.js';
import { property, query } from 'lit/decorators.js';
import TrashCan16 from '@carbon/icons/es/trash-can/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';

import styles from './chat-history.scss?lit';

/**
 * Chat History delete chat panel.
 *
 * @element cds-aichat-history-delete-panel
 *
 * @fires {CustomEvent<null>} history-delete-cancel - The deletion is canceled.
 * @fires {CustomEvent<HistoryDeleteConfirmEventDetail>} history-delete-confirm - The deletion is confirmed with the next focus target, when available.
 */
class CDSAIChatHistoryDeletePanel extends LitElement {
  static get is() {
    return `${prefix}-aichat-history-delete-panel`;
  }

  @property({ type: String, attribute: 'cancel-text', reflect: true })
  cancelText = 'Cancel';

  @property({ type: String, attribute: 'delete-text', reflect: true })
  deleteText = 'Delete';

  /**
   * Id of the chat item being deleted.
   */
  @property({ type: String, attribute: 'item-id', reflect: true })
  itemId = '';

  @query('cds-aichat-button[kind="danger"]')
  _deleteButton;

  /**
   * Finds the next chat item id after deleting `itemId`, and whether the removed chat item was * selected / active.
   *
   * Call before updating data so the DOM still reflects the chat item being removed.
   */
  private _getFocusDetailForDeletedItem(itemId: string) {
    const shell = this.closest(`${prefix}-aichat-history-shell`);
    const scope = shell ?? document;
    const tag = `${prefix}-aichat-history-panel-item`;
    const nodes = Array.from(scope.querySelectorAll(tag));
    const index = nodes.findIndex((el) => el.id === itemId);
    const deletedHost = index === -1 ? undefined : nodes[index];
    const deletedItemWasSelected =
      deletedHost !== undefined && (deletedHost as any).selected === true;

    let nextItemId;
    if (index !== -1) {
      const next =
        nodes[index + 1] ?? (index > 0 ? nodes[index - 1] : undefined);
      const nextId = next?.id;
      nextItemId =
        typeof nextId === 'string' && nextId.length > 0 ? nextId : undefined;
    }

    return {
      itemId,
      nextItemId,
      deletedItemWasSelected,
    };
  }

  // auto focus on delete button when delete panel first renders.
  async firstUpdated() {
    await this.updateComplete;
    this._deleteButton?.shadowRoot?.querySelector('button').focus();
  }

  /**
   * Handles cancel button click event
   */
  _handleCancelClick = () => {
    this.dispatchEvent(
      new CustomEvent<null>('history-delete-cancel', {
        bubbles: true,
        composed: true,
      })
    );
  };

  /**
   * Handles delete button click event
   */
  _handleDeleteClick = () => {
    const focusDetail =
      this.itemId.length > 0
        ? this._getFocusDetailForDeletedItem(this.itemId)
        : {};

    this.dispatchEvent(
      new CustomEvent<HistoryDeleteConfirmEventDetail>(
        'history-delete-confirm',
        {
          bubbles: true,
          composed: true,
          detail: {
            ...focusDetail,
          },
        }
      )
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
      <div
        aria-live="polite"
        class="${prefix}-aichat--history-delete-panel__content">
        <h1><slot name="title">Confirm Delete</slot></h1>
        <span
          ><slot name="description"
            >This conversation will be permanently deleted.</slot
          ></span
        >
        <div class="${prefix}-aichat--history-delete-panel__actions">
          <cds-aichat-button
            size="sm"
            kind="tertiary"
            @click=${handleCancelClick}
            >${cancelText}</cds-aichat-button
          >
          <cds-aichat-button size="sm" kind="danger" @click=${handleDeleteClick}
            >${deleteText}
            ${iconLoader(TrashCan16, { slot: 'icon' })}</cds-aichat-button
          >
        </div>
      </div>
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryDeletePanel };
export default CDSAIChatHistoryDeletePanel;

/** Describes focus recovery after a history row is deleted. */
export interface HistoryDeleteConfirmEventDetail {
  /** Identifier of the deleted history row, when supplied. */
  itemId?: string;
  /** Identifier of the next row to focus, when one exists. */
  nextItemId?: string;
  /** Whether the deleted row was selected. */
  deletedItemWasSelected?: boolean;
}
