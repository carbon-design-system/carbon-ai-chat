/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type CDSAIChatHistoryPanelItem from './aichat-history-panel-item.js';
import type { HistoryItemSelectedEventDetail } from './aichat-history-panel-item.js';
import { LitElement, html } from 'lit';
import { prefix } from '../../globals/settings.js';
import styles from './chat-history.scss?lit';

/**
 * Chat History Shell.
 *
 * @element cds-aichat-history-shell
 * @slot header - Represents the header section, containing title, and actions.
 * @slot toolbar - Represents the toolbar area of the chat history component (includes search, new chat button, etc).
 * @slot content - List of the chat history items.
 *
 * @fires {CustomEvent<HistoryItemSelectedEventDetail>} history-item-selected - A history row is selected, including selection after deletion.
 */
class CDSAIChatHistoryShell extends LitElement {
  static get is() {
    return `${prefix}-aichat-history-shell`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      'history-delete-confirm',
      this._handleHistoryDeleteConfirm
    );
  }

  disconnectedCallback() {
    this.removeEventListener(
      'history-delete-confirm',
      this._handleHistoryDeleteConfirm
    );
    super.disconnectedCallback();
  }

  /**
   * After the app removes the deleted row, move focus to the next row and optionally fire `history-item-selected`
   * when the deleted row was selected (detail from `cds-aichat-history-delete-panel` with `item-id` set).
   * @eventOwner {import('./aichat-history-panel-item.js').default}
   */
  private _handleHistoryDeleteConfirm = (event: Event) => {
    const detail = (event as CustomEvent).detail ?? {};
    const { nextItemId, deletedItemWasSelected } = detail;

    if (!nextItemId) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tag = `${prefix}-aichat-history-panel-item`;
        const nextHost = Array.from(this.querySelectorAll(tag)).find(
          (el) => (el as HTMLElement).id === nextItemId
        ) as CDSAIChatHistoryPanelItem | undefined;

        if (!nextHost) {
          return;
        }

        if (deletedItemWasSelected) {
          nextHost.dispatchEvent(
            new CustomEvent<HistoryItemSelectedEventDetail>(
              'history-item-selected',
              {
                bubbles: true,
                composed: true,
                detail: {
                  itemId: nextHost.id,
                  itemName: nextHost.name,
                  element: nextHost,
                },
              }
            )
          );
        }

        nextHost.focus();
      });
    });
  };

  render() {
    return html` <slot name="header"></slot>
      <slot name="toolbar"></slot>
      <slot name="content"></slot>
      <slot></slot>`;
  }

  static styles = styles;
}

export { CDSAIChatHistoryShell };
export default CDSAIChatHistoryShell;
