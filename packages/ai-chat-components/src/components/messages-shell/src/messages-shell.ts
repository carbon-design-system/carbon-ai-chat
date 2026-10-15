/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './messages-shell.scss?lit';

const blockClass = `${prefix}-messages-shell`;
const focusClass = `${blockClass}__scroller--handle-focused`;

/**
 * A scroll event detail, emitted whenever the scroll container reports a
 * position change. Part of `cds-aichat-messages-shell`, which is experimental.
 */
export interface MessagesShellScrollDetail {
  /** Current scrollTop of the scroll container, in pixels. */
  scrollTop: number;
  /** Full scrollable height of the content, in pixels. */
  scrollHeight: number;
  /** Visible height of the scroll container, in pixels. */
  clientHeight: number;
  /** Whether any content is currently scrollable (scrollHeight > clientHeight). */
  isScrollable: boolean;
  /** Whether the scroller is at (or within 1px of) the bottom. */
  isAtBottom: boolean;
}

/**
 * Message list shell — layout container for the chat message list.
 *
 * Provides the structural layout and named slots for the message list area.
 * Autoscroll and keyboard navigation are added in subsequent issues (#1841,
 * #1842). Ship and use this element for the layout contract only.
 *
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
@carbonElement(`${prefix}-messages-shell`)
class CDSAIChatMessagesShell extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Accessible label for the top scroll handle button.
   * Provide a translated string for the host's locale.
   */
  @property({ attribute: 'top-handle-label' })
  topHandleLabel = '';

  /**
   * Accessible label for the bottom scroll handle button.
   * Provide a translated string for the host's locale.
   */
  @property({ attribute: 'bottom-handle-label' })
  bottomHandleLabel = '';

  /** @internal */
  private _scrollerEl: HTMLElement | null = null;

  /** @internal */
  private get _scroller(): HTMLElement | null {
    if (!this._scrollerEl && this.shadowRoot) {
      this._scrollerEl = this.shadowRoot.querySelector<HTMLElement>(
        `.${blockClass}__scroller`
      );
    }
    return this._scrollerEl;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._scrollerEl?.removeEventListener('scroll', this._handleScroll);
    this._scrollerEl = null;
  }

  protected firstUpdated(): void {
    // The scroller exists after first render. Store the reference and attach
    // the listener; subsequent re-renders do not re-attach (firstUpdated runs once).
    const scroller = this._scroller;
    if (scroller) {
      scroller.addEventListener('scroll', this._handleScroll, {
        passive: true,
      });
    }
  }

  private _handleScroll = (): void => {
    const scroller = this._scroller;
    if (!scroller) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const isScrollable = scrollHeight > clientHeight;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 1;

    this.dispatchEvent(
      new CustomEvent<MessagesShellScrollDetail>(
        'cds-aichat-messages-shell-scroll',
        {
          bubbles: true,
          composed: true,
          detail: {
            scrollTop,
            scrollHeight,
            clientHeight,
            isScrollable,
            isAtBottom,
          },
        }
      )
    );
  };

  private _onHandleFocus = (): void => {
    this._scroller?.classList.add(focusClass);
  };

  private _onHandleBlur = (): void => {
    this._scroller?.classList.remove(focusClass);
  };

  private _onHandleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.target as HTMLElement).click();
    }
  };

  private _renderScrollHandle(atBottom = false) {
    const label = atBottom ? this.bottomHandleLabel : this.topHandleLabel;
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
      ${this._renderScrollHandle(false)}
      <div class="${blockClass}__scroller" part="scroller">
        <div class="${blockClass}__content">
          <slot></slot>
          <slot name="processing"></slot>
          <div class="${blockClass}__spacer" part="spacer"></div>
          <slot name="scroll-down"></slot>
        </div>
      </div>
      ${this._renderScrollHandle(true)}
      <slot name="error" class="${blockClass}__error"></slot>
    `;
  }
}

export { CDSAIChatMessagesShell };
export default CDSAIChatMessagesShell;
