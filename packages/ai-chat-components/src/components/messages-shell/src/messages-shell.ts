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
 * Attribute set on the inner `.cds-aichat-messages-shell__scroller` element to
 * create a per-instance CSS selector. The var-sheet rules are adopted on the
 * shadow root, so the selector must target an element *inside* the shadow tree —
 * the host's `id` lives in the light DOM and cannot be matched from inside.
 *
 * Pattern mirrors `data-cds-aichat-shell-id` in chat-shell.
 */
const INSTANCE_ATTR = 'data-cds-aichat-messages-shell-id';

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
   * Per-instance CSS selectors used as the key for the dynamic var-sheet rules.
   * Built once in firstUpdated after the shadow DOM is ready, then stable for
   * the lifetime of the element. Keyed on a data attribute set on the scroller
   * element inside the shadow tree so the selectors match within the adopted sheet.
   */
  private _spacerSelector = '';
  private _floorSelector = '';

  /** scrollTop captured just before rebuilding the portable-message list, passed to the engine as the pre-commit snapshot for Safari scroll-anchoring restore. */
  private _lastScrollTop: number | null = null;

  /** MutationObserver that watches for data-aichat-streaming / data-aichat-pinnable changes on slotted rows. Rebuilt on every slotchange. */
  private _rowObserver: MutationObserver | null = null;

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
   *
   * The selector targets the spacer element by its class name, scoped to the
   * per-instance attribute on `.__scroller`. This keeps the rule inside the
   * shadow tree where the adopted sheet's selectors apply.
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

    // Create the engine immediately so onHostUpdated calls before first render
    // are safely buffered (the engine guards with `this.disconnected`). The
    // observer and scroll-listener are attached in firstUpdated once the
    // shadow DOM has rendered and the scroller element is available.
    this._scroll = new MessagesScrollController(this as unknown as ScrollHost);

    if (this.hasUpdated) {
      // Re-attaching after a real teardown — shadow DOM already exists.
      this._connectEngine();
    }
    // else: firstUpdated will call _connectEngine on the initial render.
  }

  protected firstUpdated() {
    this._connectEngine();
  }

  /**
   * Set up the per-instance CSS selectors and connect the scroll engine.
   * Called from firstUpdated on first mount and from connectedCallback on
   * re-attachment (matching the chat-shell pattern in shell.ts).
   */
  private _connectEngine(): void {
    // Assign a stable per-instance attribute on the scroller element so the
    // var-sheet selectors target elements inside the shadow tree.
    // (The host's `id` is light-DOM and cannot be matched inside an adopted sheet.)
    const instanceId = `${instanceCount++}`;
    this._scroller.setAttribute(INSTANCE_ATTR, instanceId);

    const scopedAttr = `[${INSTANCE_ATTR}="${instanceId}"]`;
    this._spacerSelector = `${scopedAttr} .${blockClass}__spacer`;
    this._floorSelector = `${scopedAttr} .${blockClass}__content`;

    // Adopt the shared dynamic var sheet so rules written by setVarsForSelector
    // apply inside this shadow root.
    adoptOnRoot(this.renderRoot as ShadowRoot);

    this._portableMessages = this._buildPortableMessages();
    this._scroll.connect();
    this._connectRowObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._scroll?.disconnect();
    this._updateScrollDownButton.cancel();
    // Stop watching slotted rows for attribute changes.
    this._rowObserver?.disconnect();
    this._rowObserver = null;
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
   *
   * `slotchange` fires on slot-assignment changes (rows added/removed) but not
   * on in-place attribute mutations. A MutationObserver handles the streaming
   * flag (see `_connectRowObserver`).
   */
  private _onDefaultSlotChange = (): void => {
    // Capture scrollTop before the rebuild so the engine can use it as the
    // pre-commit snapshot for Safari scroll-anchoring restore.
    this._lastScrollTop = this._scroller?.scrollTop ?? null;
    this._portableMessages = this._buildPortableMessages();
    this._scroll?.onHostUpdated(this._lastScrollTop);
    this._connectRowObserver();
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

  /**
   * Watch each slotted row for changes to the three `data-aichat-*` attributes.
   * `slotchange` only fires when slot assignments change (rows added/removed),
   * not when an existing row's attributes are mutated in place. A MutationObserver
   * catches the in-place case — for example, when `data-aichat-streaming` is
   * removed after the AI response finishes, triggering the stream-end re-pin.
   */
  private _connectRowObserver(): void {
    this._rowObserver?.disconnect();
    const elements = this._portableMessages
      .map((m) => m.element)
      .filter(Boolean) as HTMLElement[];
    if (!elements.length) {
      this._rowObserver = null;
      return;
    }
    this._rowObserver = new MutationObserver(() => {
      this._lastScrollTop = this._scroller?.scrollTop ?? null;
      this._portableMessages = this._buildPortableMessages();
      this._scroll?.onHostUpdated(this._lastScrollTop);
    });
    for (const el of elements) {
      this._rowObserver.observe(el, {
        attributes: true,
        attributeFilter: [
          'data-aichat-pinnable',
          'data-aichat-streaming',
          'data-aichat-response',
        ],
      });
    }
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
