/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["element", "slot", "csspart"] }] */

import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './message-item-shell.scss?lit';

const blockClass = `${prefix}-message-item-shell`;

/**
 * Whether a row is sent by the user or received from the assistant.
 */
export type MessageItemShellRowType = 'request' | 'response';

/**
 * The frame for one message row. It provides slots for the byline, content,
 * attachments, and footer. It knows nothing about message data or response
 * types. Request and response rows use the same shell; the `row-type`
 * attribute controls the layout.
 *
 * @experimental
 * @element cds-aichat-message-item-shell
 *
 * @slot byline - The name, timestamp, and avatar. Hidden when `hidden-avatar` is set.
 * @slot - Default slot. The message content.
 * @slot attachment - File upload status.
 * @slot footer - Footer content from the host.
 *
 * @csspart slot-byline - The wrapper around the byline slot.
 * @csspart slot-content - The wrapper around the default slot.
 * @csspart slot-attachment - The wrapper around the attachment slot.
 * @csspart slot-footer - The wrapper around the footer slot.
 */
@carbonElement(blockClass)
class CDSAIChatMessageItemShell extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Whether the row is a request (outbound) or a response (inbound).
   * Controls the layout direction.
   */
  @property({ attribute: 'row-type', reflect: true })
  rowType?: MessageItemShellRowType;

  /**
   * Breaks the content out of the inset column.
   */
  @property({ type: Boolean, attribute: 'full-width', reflect: true })
  fullWidth = false;

  /**
   * A stable ID for this row.
   */
  @property({ attribute: 'row-id' })
  rowId = '';

  /**
   * An ID shared by the rows that belong to the same response.
   */
  @property({ attribute: 'group-id' })
  groupId = '';

  /**
   * Whether the row is streaming.
   */
  @property({ type: Boolean, reflect: true })
  streaming = false;

  /**
   * Whether the row is the first in the list.
   */
  @property({ type: Boolean, attribute: 'first-item', reflect: true })
  firstItem = false;

  /**
   * Whether the row is the last in the list.
   */
  @property({ type: Boolean, attribute: 'last-item', reflect: true })
  lastItem = false;

  /**
   * Whether the row is part of the conversation history.
   */
  @property({ type: Boolean, reflect: true })
  history = false;

  /**
   * Hides the byline area, including the avatar. Applies to both row types.
   */
  @property({ type: Boolean, attribute: 'hidden-avatar', reflect: true })
  hiddenAvatar = false;

  render() {
    return html`
      <div class="${blockClass}__byline" part="slot-byline">
        <slot name="byline"></slot>
      </div>
      <div class="${blockClass}__content" part="slot-content">
        <slot></slot>
      </div>
      <div class="${blockClass}__attachment" part="slot-attachment">
        <slot name="attachment"></slot>
      </div>
      <div class="${blockClass}__footer" part="slot-footer">
        <slot name="footer"></slot>
      </div>
    `;
  }
}

export { CDSAIChatMessageItemShell };
export default CDSAIChatMessageItemShell;

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-message-item-shell': CDSAIChatMessageItemShell;
  }
}
