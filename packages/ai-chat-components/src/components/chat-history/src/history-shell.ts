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
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History Shell.
 *
 * @element cds-aichat-history-shell
 * @slot header - Represents the header section, containing title, and actions.
 * @slot toolbar - Represents the toolbar area of the chat history component (includes search, new chat button, etc).
 * @slot content - List of the chat history items.
 *
 */
@carbonElement(`${prefix}-history-shell`)
class CDSAIChatHistoryShell extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "history-delete-confirm",
      this._handleHistoryDeleteConfirm,
    );
  }

  disconnectedCallback() {
    this.removeEventListener(
      "history-delete-confirm",
      this._handleHistoryDeleteConfirm,
    );
    super.disconnectedCallback();
  }

  /**
   * After the app removes the deleted row, move focus to the next row and optionally fire `history-item-selected`
   * when the deleted row was selected (detail from `cds-aichat-history-delete-panel` with `item-id` set).
   */
  private _handleHistoryDeleteConfirm = (event: Event) => {
    const detail = (event as CustomEvent).detail ?? {};
    const { nextItemId, deletedItemWasSelected } = detail;

    if (!nextItemId) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tag = `${prefix}-history-panel-item`;
        const nextHost = Array.from(this.querySelectorAll(tag)).find(
          (el) => (el as HTMLElement).id === nextItemId,
        ) as HTMLElement | undefined;

        if (!nextHost) {
          return;
        }

        if (deletedItemWasSelected) {
          nextHost.dispatchEvent(
            new CustomEvent("history-item-selected", {
              bubbles: true,
              composed: true,
              detail: {
                itemId: nextHost.id,
                itemName: (nextHost as any).name,
                element: nextHost,
              },
            }),
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
