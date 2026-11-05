/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './message-byline.scss?lit';

const blockClass = `${prefix}-message-byline`;

/**
 * The top section of a message: an optional avatar, the sender label, a timestamp,
 * and optional reasoning controls. It knows nothing about message data; the
 * host supplies every value.
 *
 * @experimental
 * @element cds-aichat-message-byline
 *
 * @slot avatar - Optional avatar. The byline centers it in a fixed square box. Nothing is rendered for this slot while it is empty.
 * @slot reasoning - Optional reasoning steps control, such as a `cds-aichat-reasoning-steps-toggle`. The byline adds a separator before it. The host renders the panel the toggle controls outside the byline.
 */
@carbonElement(blockClass)
class CDSAIChatMessageByline extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * The sender name to display.
   */
  @property({ type: String })
  label = '';

  /**
   * The formatted time string for the message. The host formats it.
   */
  @property({ type: String })
  timestamp = '';

  /**
   * Whether the `avatar` slot has content.
   */
  @state()
  private _hasAvatar = false;

  /**
   * Whether the `reasoning` slot has content.
   */
  @state()
  private _hasReasoning = false;

  private _onAvatarSlotChange = (event: Event): void => {
    this._hasAvatar =
      (event.target as HTMLSlotElement).assignedNodes({ flatten: true })
        .length > 0;
  };

  private _onReasoningSlotChange = (event: Event): void => {
    this._hasReasoning =
      (event.target as HTMLSlotElement).assignedNodes({ flatten: true })
        .length > 0;
  };

  render() {
    return html`
      <span class="${blockClass}__avatar" ?hidden=${!this._hasAvatar}>
        <slot name="avatar" @slotchange=${this._onAvatarSlotChange}></slot>
      </span>
      <span class="${blockClass}__label"
        >${[this.label, this.timestamp].filter(Boolean).join(' ')}</span
      >
      <span class="${blockClass}__reasoning" ?hidden=${!this._hasReasoning}>
        <span class="${blockClass}__reasoning-separator" aria-hidden="true"
          >|</span
        >
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
