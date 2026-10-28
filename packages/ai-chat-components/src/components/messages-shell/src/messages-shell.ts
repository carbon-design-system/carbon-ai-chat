/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './messages-shell.scss?lit';

const blockClass = `${prefix}-messages-shell`;
const focusClass = `${blockClass}__scroller--handle-focused`;

/**
 * Details sent with each scroll event from the message list.
 */
export interface MessagesShellScrollDetail {
  /** How far the list is scrolled from the top, in pixels. */
  scrollTop: number;
  /** The full height of the content, in pixels. */
  scrollHeight: number;
  /** The visible height of the list, in pixels. */
  clientHeight: number;
  /** Whether the content is taller than the visible area. */
  isScrollable: boolean;
  /** Whether the list is scrolled to the bottom (within 1px). */
  isAtBottom: boolean;
}

/**
 * Layout container for the chat message list. It provides named slots for the
 * rows and the controls around them, and reports scroll position. Autoscroll
 * and row navigation are not part of this element yet.
 *
 * @experimental
 * @element cds-aichat-messages-shell
 *
 * @slot notifications - Sticky notices above the scroller (e.g. human-agent banners).
 * @slot - Default slot. Message rows go here, inside the scroll container.
 * @slot processing - The typing / processing indicator, inside the scroll container.
 * @slot scroll-down - The scroll-to-bottom control. Rendered sticky inside the scroller.
 * @slot error - Footer errors anchored below the scroller.
 *
 * @fires {CustomEvent<MessagesShellScrollDetail>} cds-aichat-messages-shell-scroll -
 *   Fired on every scroll event. Detail carries position and geometry readings.
 */
@carbonElement(blockClass)
class CDSAIChatMessagesShell extends LitElement {
  static styles = [commonStyles, styles];

  /** Name of the event fired when the list scrolls. */
  static get eventScroll() {
    return `${blockClass}-scroll`;
  }

  /**
   * Visible and accessible label for the top scroll handle.
   * Provide a translated string for the host's locale. The handle is omitted when empty.
   */
  @property({ attribute: 'top-handle-label' })
  topHandleLabel = '';

  /**
   * Visible and accessible label for the bottom scroll handle.
   * Provide a translated string for the host's locale. The handle is omitted when empty.
   */
  @property({ attribute: 'bottom-handle-label' })
  bottomHandleLabel = '';

  @query(`.${blockClass}__scroller`)
  private _scroller!: HTMLElement;

  private _handleScroll = (): void => {
    const { scrollTop, scrollHeight, clientHeight } = this._scroller;

    this.dispatchEvent(
      new CustomEvent<MessagesShellScrollDetail>(
        CDSAIChatMessagesShell.eventScroll,
        {
          bubbles: true,
          composed: true,
          detail: {
            scrollTop,
            scrollHeight,
            clientHeight,
            isScrollable: scrollHeight > clientHeight,
            // Allow 1px of slack, because scroll positions can be fractional.
            isAtBottom: scrollHeight - scrollTop - clientHeight <= 1,
          },
        }
      )
    );
  };

  // The focus ring is switched on and off by editing the class directly,
  // not through reactive state. A re-render while the handle has focus
  // can make the browser drop that focus.
  private _onHandleFocus = (): void => {
    this._scroller.classList.add(focusClass);
  };

  private _onHandleBlur = (): void => {
    this._scroller.classList.remove(focusClass);
  };

  private _onHandleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  };

  private _renderScrollHandle(label: string) {
    if (!label) {
      return nothing;
    }
    return html`
      <button
        type="button"
        class="${blockClass}__scroll-handle"
        aria-label=${label}
        @focus=${this._onHandleFocus}
        @blur=${this._onHandleBlur}
        @keydown=${this._onHandleKeyDown}>
        ${label}
      </button>
    `;
  }

  render() {
    return html`
      <slot name="notifications" class="${blockClass}__notifications"></slot>
      ${this._renderScrollHandle(this.topHandleLabel)}
      <div class="${blockClass}__scroller" @scroll=${this._handleScroll}>
        <div class="${blockClass}__content">
          <slot></slot>
          <slot name="processing"></slot>
          <div class="${blockClass}__spacer"></div>
          <slot name="scroll-down"></slot>
        </div>
      </div>
      ${this._renderScrollHandle(this.bottomHandleLabel)}
      <slot name="error" class="${blockClass}__error"></slot>
    `;
  }
}

export { CDSAIChatMessagesShell };
export default CDSAIChatMessagesShell;
