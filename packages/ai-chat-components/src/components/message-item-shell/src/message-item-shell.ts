/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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
 * @slot byline - The byline area. Contains the user name, timestamp, and avatar.
 * @slot - default slot. The message content.
 * @slot attachment - File upload chips or other attachments. The shell adds no announcements; the slotted content decides what screen readers hear.
 * @slot footer - Footer content from the host.
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
   * Hides the avatar within the byline slot. The name and timestamp remain
   * visible. Applies to both row types.
   *
   * The avatar must be a direct child of the shell with `slot="byline"` and
   * the class `cds-aichat-message-item-shell__byline-avatar`. Avatars nested
   * inside another slotted element are not hidden.
   */
  @property({ type: Boolean, attribute: 'hide-avatar', reflect: true })
  hideAvatar = false;

  render() {
    return html`
      <div class="${blockClass}__byline">
        <slot name="byline"></slot>
      </div>
      <div class="${blockClass}__body">
        <div class="${blockClass}__content">
          <slot></slot>
        </div>
        <div class="${blockClass}__attachment">
          <slot name="attachment"></slot>
        </div>
        <div class="${blockClass}__footer">
          <slot name="footer"></slot>
        </div>
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
