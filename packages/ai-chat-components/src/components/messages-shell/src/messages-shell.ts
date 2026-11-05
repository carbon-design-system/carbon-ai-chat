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
import throttle from 'lodash-es/throttle.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './messages-shell.scss?lit';
import {
  MessagesScrollController,
  type PortableMessage,
  type ScrollHost,
  type ScrollOptions,
} from './messages-scroll-controller.js';
import {
  adoptOnRoot,
  clearSelector,
  setVarsForSelector,
} from '../../shared/dynamic-css-var-sheet.js';

const blockClass = `${prefix}-messages-shell`;
const focusClass = `${blockClass}__scroller--handle-focused`;

/**
 * Throttle delay (ms) for updating the scroll-to-bottom button visibility.
 * Matches the 200 ms trailing debounce used in the React MessagesComponent
 * (SCROLL_NOTIFICATION_THROTTLE_MS in MessagesComponent.tsx).
 */
const SCROLL_DOWN_BUTTON_THROTTLE_MS = 200;

/**
 * Counter used to generate unique element IDs when the host does not supply one.
 * Each connected instance gets its own suffix, ensuring the CSS var-sheet selectors
 * do not collide across multiple shells on the same page.
 */
let instanceCount = 0;

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
 * rows and the controls around them, reports scroll position, and owns the
 * autoscroll engine.
 *
 * Hosts place message rows in the default slot. Each row that should act as a
 * scroll pin target must carry the `data-aichat-pinnable` boolean attribute.
 * Rows that are actively streaming must carry `data-aichat-streaming`. Both
 * attributes come from `cds-aichat-message-item-shell`; custom rows must add
 * them manually.
 *
 * @experimental
 * @element cds-aichat-messages-shell
 *
 * @slot notifications - Sticky notices above the scroller (e.g. human-agent banners).
 * @slot - Default slot. Message rows go here, inside the scroll container.
 * @slot processing - The typing / processing indicator, inside the scroll container.
 * @slot scroll-down - Extra scroll-to-bottom content. Rendered sticky inside the scroller.
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

  // --------------------------------------------------------------------------
  // Public properties
  // --------------------------------------------------------------------------

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

  /**
   * Accessible label for the built-in scroll-to-bottom button.
   * The button is hidden when this property is empty.
   * Provide a translated string for the host's locale.
   */
  @property({ attribute: 'scroll-down-button-label' })
  scrollDownButtonLabel = '';

  // --------------------------------------------------------------------------
  // Shadow-DOM element queries
  // --------------------------------------------------------------------------

  @query(`.${blockClass}__scroller`)
  private _scroller!: HTMLElement;

  @query(`.${blockClass}__spacer`)
  private _spacer!: HTMLElement;

  // --------------------------------------------------------------------------
  // Private state
  // --------------------------------------------------------------------------

  /** The autoscroll engine — created fresh on each connectedCallback. */
  private _scroll!: MessagesScrollController;

  /**
   * The latest portable-message snapshot built from the default slot.
   * Rebuilt on every slotchange and passed to the engine through ScrollHost.
   */
  private _portableMessages: PortableMessage[] = [];

  /** True while a scroll handle has keyboard focus (suppresses the scroll-down button). */
  private _handleHasFocus = false;

  /** Whether the scroll-down button is currently visible. */
  private _showScrollDownButton = false;

  /**
   * Per-instance CSS selector used as the key for the dynamic var-sheet rules.
   * Set once in connectedCallback and stable for the lifetime of the element.
   */
  private _spacerSelector = '';
  private _floorSelector = '';

  // --------------------------------------------------------------------------
  // ScrollHost implementation
  // Implementing ScrollHost directly on the element keeps the adapter thin
  // and avoids allocating a separate object.
  // --------------------------------------------------------------------------

  getScrollContainer = (): HTMLElement | null => this._scroller ?? null;

  getSpacer = (): HTMLElement | null => this._spacer ?? null;

  /**
   * Write the spacer's min-block-size through the shared CSP-safe stylesheet.
   * Avoids inline `style` attributes, which a strict `style-src-attr` CSP blocks.
   */
  setSpacerHeight = (px: number): void => {
    if (px === 0) {
      clearSelector(this._spacerSelector);
    } else {
      setVarsForSelector(this._spacerSelector, { 'min-block-size': `${px}px` });
    }
  };

  /**
   * Write a min-block-size floor on the content container so the scroll range
   * stays reachable through transient content collapse (e.g. a reasoning step
   * that collapses and then regrows before ResizeObserver fires).
   */
  setScrollHeightFloor = (px: number): void => {
    if (px === 0) {
      clearSelector(this._floorSelector);
    } else {
      setVarsForSelector(this._floorSelector, { 'min-block-size': `${px}px` });
    }
  };

  getMessages = (): PortableMessage[] => this._portableMessages;

  hasMessage = (messageId: string): boolean =>
    this._portableMessages.some((m) => m.messageId === messageId);

  /** Called by the engine whenever scroll geometry changes. Updates button visibility. */
  onScrollGeometryChanged = (): void => {
    this._updateScrollDownButton();
  };

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  connectedCallback() {
    super.connectedCallback();

    // Adopt the shared dynamic var sheet on this shadow root so
    // setVarsForSelector rules apply inside the component tree.
    this.updateComplete.then(() => {
      adoptOnRoot(this.renderRoot as ShadowRoot);
    });

    // Assign a stable unique ID if the host did not supply one.
    // This ID anchors the per-instance CSS rules in the var sheet.
    if (!this.id) {
      this.id = `${blockClass}-${instanceCount++}`;
    }
    this._spacerSelector = `#${this.id} .${blockClass}__spacer`;
    // The floor targets the content container (parent of the spacer), matching
    // the React implementation where it targets bottomSpacerRef.current?.parentElement.
    this._floorSelector = `#${this.id} .${blockClass}__content`;

    // Create and connect the scroll engine, passing this element as the host.
    this._scroll = new MessagesScrollController(this as unknown as ScrollHost);
    this._scroll.connect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._scroll?.disconnect();
    this._updateScrollDownButton.cancel();
    // Remove any lingering var-sheet rules for this instance.
    clearSelector(this._spacerSelector);
    clearSelector(this._floorSelector);
  }

  // --------------------------------------------------------------------------
  // Row discovery
  // --------------------------------------------------------------------------

  /**
   * Rebuild the portable-message array whenever the default slot changes and
   * inform the scroll engine of the update.
   *
   * Rows are read from the slot in document order. The engine uses
   * `data-aichat-pinnable` and `data-aichat-streaming` to decide scroll targets;
   * these attributes come from `cds-aichat-message-item-shell`. Hosts using
   * custom rows must add the attributes themselves.
   */
  private _onDefaultSlotChange = (): void => {
    this._portableMessages = this._buildPortableMessages();
    this._scroll?.onHostUpdated(null);
  };

  private _buildPortableMessages(): PortableMessage[] {
    const slot =
      this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!slot) {
      return [];
    }
    return slot.assignedElements({ flatten: true }).map((el) => {
      const elem = el as HTMLElement;
      return {
        id: elem.id || '',
        messageId: elem.dataset.messageId || elem.id || '',
        element: elem,
        isPinnable: elem.hasAttribute('data-aichat-pinnable'),
        isStreaming: elem.hasAttribute('data-aichat-streaming'),
        isResponse: elem.hasAttribute('data-aichat-response'),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Scroll-down button
  // --------------------------------------------------------------------------

  /**
   * Throttled updater for the scroll-to-bottom button visibility.
   *
   * Uses a 200 ms trailing throttle so rapid geometry changes (e.g. streaming
   * chunks) don't cause a re-render on every event. The button is suppressed
   * while a scroll handle has focus to avoid false positives from the handle's
   * expanded layout.
   */
  private _updateScrollDownButton = throttle(
    () => {
      const shouldShow =
        !this._handleHasFocus &&
        Boolean(this._scroll?.isScrolledAwayFromBottom());
      if (shouldShow !== this._showScrollDownButton) {
        this._showScrollDownButton = shouldShow;
        this.requestUpdate();
      }
    },
    SCROLL_DOWN_BUTTON_THROTTLE_MS,
    { leading: false, trailing: true }
  );

  private _onScrollDownClick = (): void => {
    // Use doAutoScrollInternal to bypass the public-API spacer-reconciliation
    // pass, matching the behaviour of the scroll-to-bottom button in
    // MessagesComponent (see packages/ai-chat/src/chat/components-legacy/MessagesComponent.tsx).
    this._scroll?.doAutoScrollInternal({
      scrollToBottom: 0,
      preferAnimate: true,
    });
  };

  // --------------------------------------------------------------------------
  // Scroll event forwarding
  // --------------------------------------------------------------------------

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

    // Also update the scroll-down button on every scroll event.
    this._updateScrollDownButton();
  };

  // --------------------------------------------------------------------------
  // Scroll-handle focus/blur
  // --------------------------------------------------------------------------

  // The focus ring is switched on and off by editing the class directly,
  // not through reactive state. A re-render while the handle has focus
  // can make the browser drop that focus.
  private _onHandleFocus = (): void => {
    this._scroller.classList.add(focusClass);
    // Hide the scroll-down button while a handle has focus: the handle's
    // expanded layout triggers a false-positive scroll-away measurement.
    this._handleHasFocus = true;
    this._updateScrollDownButton();
  };

  private _onHandleBlur = (): void => {
    this._scroller.classList.remove(focusClass);
    this._handleHasFocus = false;
    this._updateScrollDownButton();
  };

  private _onHandleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  };

  // --------------------------------------------------------------------------
  // Public scroll API (thin pass-throughs to the engine)
  // --------------------------------------------------------------------------

  /**
   * Trigger an auto-scroll. Pass `scrollToBottom: 0` to jump to the bottom,
   * or omit options to let the engine re-pin the latest message.
   */
  doAutoScroll(options: ScrollOptions = {}): void {
    this._scroll?.doAutoScroll(options);
  }

  /**
   * Scroll `element` into view if it is not already fully visible.
   *
   * @param element - The element to scroll to.
   * @param paddingTop - Extra pixels of padding above the element (default 8).
   * @param paddingBottom - Extra pixels of padding below the element (default 8).
   * @param animate - Prefer smooth animation (default false).
   */
  scrollElementIntoView(
    element: HTMLElement,
    paddingTop = 8,
    paddingBottom = 8,
    animate = false
  ): void {
    this._scroll?.scrollElementIntoView(
      element,
      paddingTop,
      paddingBottom,
      animate
    );
  }

  /**
   * Scroll the list so `messageElement` appears at the top of the visible area.
   *
   * @param messageElement - The row element to scroll to.
   * @param animate - Prefer smooth animation (default false).
   */
  doScrollToMessageElement(
    messageElement: HTMLElement | null,
    animate = false
  ): void {
    this._scroll?.doScrollToMessageElement(messageElement, animate);
  }

  /**
   * Returns how many pixels the list is scrolled from the bottom.
   */
  getContainerScrollBottom(): number {
    return this._scroll?.getContainerScrollBottom() ?? 0;
  }

  /**
   * Returns `true` when the user has scrolled far enough from the bottom that
   * the scroll-to-bottom button should be shown.
   */
  isScrolledAwayFromBottom(): boolean {
    return this._scroll?.isScrolledAwayFromBottom() ?? false;
  }

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------

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

  private _renderScrollDownButton() {
    if (!this.scrollDownButtonLabel) {
      return nothing;
    }
    return html`
      <button
        part="scroll-down-button"
        type="button"
        class="${blockClass}__scroll-down-button"
        ?hidden=${!this._showScrollDownButton}
        @click=${this._onScrollDownClick}>
        ${this.scrollDownButtonLabel}
      </button>
    `;
  }

  render() {
    return html`
      <slot name="notifications" class="${blockClass}__notifications"></slot>
      ${this._renderScrollHandle(this.topHandleLabel)}
      <div class="${blockClass}__scroller" @scroll=${this._handleScroll}>
        <div class="${blockClass}__content">
          <slot @slotchange=${this._onDefaultSlotChange}></slot>
          <slot name="processing"></slot>
          <div class="${blockClass}__spacer"></div>
          ${this._renderScrollDownButton()}
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
