/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './message-byline.scss?lit';

const blockClass = `${prefix}-message-byline`;

/**
 * Shows who sent a message: an optional avatar, the sender label, a timestamp,
 * and optional reasoning controls. It knows nothing about message data; the
 * host supplies every value.
 *
 * Do not give a slotted avatar its own label. The sender `label` already
 * names the sender, and a second label makes screen readers say it twice.
 *
 * @experimental
 * @element cds-aichat-message-byline
 *
 * @slot avatar - Optional avatar. Nothing is rendered for this slot while it is empty.
 * @slot reasoning - Optional reasoning controls, such as a toggle that opens the reasoning steps above the message.
 */
@carbonElement(blockClass)
class CDSAIChatMessageByline extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * The sender name or role, such as "Assistant" or "Jane Doe".
   */
  @property({ type: String })
  label = '';

  /**
   * The formatted time string for the message. The host formats it.
   */
  @property({ type: String })
  timestamp = '';

  /**
   * Whether the `reasoning` slot has content.
   */
  @state()
  private _hasReasoning = false;

  private _onAvatarSlotChange = (event: Event): void => {
    // Reflect slot state as `has-avatar` so hosts can style on it.
    this.toggleAttribute(
      'has-avatar',
      (event.target as HTMLSlotElement).assignedNodes({ flatten: true })
        .length > 0
    );
  };

  private _onReasoningSlotChange = (event: Event): void => {
    this._hasReasoning =
      (event.target as HTMLSlotElement).assignedNodes({ flatten: true })
        .length > 0;
  };

  render() {
    return html`
      <slot name="avatar" @slotchange=${this._onAvatarSlotChange}></slot>
      <span class="${blockClass}__label">${this.label}</span>
      ${
        this.timestamp
          ? html`<span class="${blockClass}__timestamp"
              >${this.timestamp}</span
            >`
          : nothing
      }
      <span class="${blockClass}__reasoning" ?hidden=${!this._hasReasoning}>
        <slot
          name="reasoning"
          @slotchange=${this._onReasoningSlotChange}></slot>
      </span>
    `;
  }
}

export { CDSAIChatMessageByline };
export default CDSAIChatMessageByline;

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-message-byline': CDSAIChatMessageByline;
  }
}
