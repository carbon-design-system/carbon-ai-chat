/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  applySafariScrollAnchoringRestore,
  didClearAllMessages,
  getAnchoringRestoreTarget,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasMessagesOutOfView,
  hasNewNonStreamingResponse,
  MessagesScrollController,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  resolveUserScrollAway,
  type AutoScrollAction,
  type PortableMessage,
  type ScrollHost,
} from '../../../src/chat/utils/messagesAutoScrollController';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock factories
//
// The controller now consumes a framework-neutral `PortableMessage[]` (built by
// the host adapter). `isPinnable` is derived by the host — in the React
// `MessagesComponent` it is `shouldScrollToMessage(fullMessage, allMessagesByID)`
// (see MessagesComponent.getPortableMessages). Here we drive selection by setting
// the `isPinnable` flag directly, since the request-vs-silent-response derivation
// now lives in the host's private `shouldScrollToMessage` and is out of scope.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal scroll-element mock with writable scrollTop so tests can
 * assert that pinMessageAndScroll writes the right value.
 */
function createMockScrollElement(
  overrides: Partial<{
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    offsetHeight: number;
    rectTop: number;
  }> = {}
) {
  const {
    scrollTop = 0,
    clientHeight = 500,
    scrollHeight = 1000,
    offsetHeight = 500,
    rectTop = 0,
  } = overrides;
  return {
    scrollTop,
    clientHeight,
    scrollHeight,
    offsetHeight,
    getBoundingClientRect: () =>
      ({ top: rectTop, height: clientHeight }) as DOMRect,
  };
}

/**
 * Creates a minimal spacer element mock. Spacer height is now applied via the
 * injected `setSpacerHeight` callback, so the spec verifies the deficit through
 * that callback and the function's return value rather than any DOM style.
 */
function createMockSpacer(rectTop = 400) {
  return {
    getBoundingClientRect: () => ({ top: rectTop }) as DOMRect,
  } as unknown as HTMLElement;
}

/**
 * Creates a fake element that reports a specific bounding rect. Used where the
 * controller only measures the element (e.g. recalculatePinnedMessageSpacer's
 * pinnedElement).
 */
function createRectElement(rectTop: number, rectHeight: number): HTMLElement {
  return {
    getBoundingClientRect: () =>
      ({ top: rectTop, height: rectHeight }) as DOMRect,
  } as unknown as HTMLElement;
}

/**
 * Creates a fake message element with a specific bounding rect, wrapped as a
 * PortableMessage. Passed to pinMessageAndScroll / findLastPinnable, etc.
 */
function createPortableMessage(
  overrides: Partial<PortableMessage> & { id: string }
): PortableMessage {
  return {
    messageId: overrides.id,
    element: null,
    isPinnable: false,
    isStreaming: false,
    isResponse: false,
    ...overrides,
  };
}

/**
 * Creates a PortableMessage whose element reports a specific bounding rect,
 * used for the geometry-driven pin/recalculate cases.
 */
function createMessageWithRect(
  id: string,
  rectTop: number,
  rectHeight: number
): PortableMessage {
  return createPortableMessage({
    id,
    element: createRectElement(rectTop, rectHeight),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveAutoScrollAction
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveAutoScrollAction', () => {
  const scrollElement = createMockScrollElement({
    scrollHeight: 2000,
    offsetHeight: 500,
  }) as any;

  // An element stub sufficient for the pin candidate (must be non-null).
  const stubElement = {} as HTMLElement;

  it('returns scroll_to_top when scrollToTop option is provided', () => {
    const action = resolveAutoScrollAction({
      messages: [],
      options: { scrollToTop: 350 },
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action).toEqual({ type: 'scroll_to_top', scrollTop: 350 });
  });

  it('returns scroll_to_bottom with computed scrollTop when scrollToBottom option is provided', () => {
    const action = resolveAutoScrollAction({
      messages: [],
      options: { scrollToBottom: 0 },
      pinnedMessageId: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: 'scroll_to_bottom' }>;
    // scrollTop = scrollHeight - offsetHeight - scrollToBottom = 2000 - 500 - 0 = 1500
    expect(action.type).toBe('scroll_to_bottom');
    expect(action.scrollTop).toBe(1500);
    expect(action.preferAnimate).toBe(false);
  });

  it('passes preferAnimate through on scroll_to_bottom', () => {
    const action = resolveAutoScrollAction({
      messages: [],
      options: { scrollToBottom: 0, preferAnimate: true },
      pinnedMessageId: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: 'scroll_to_bottom' }>;
    expect(action.preferAnimate).toBe(true);
  });

  it('returns reset_to_top when messages is empty and no override is provided', () => {
    const action = resolveAutoScrollAction({
      messages: [],
      options: {},
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action).toEqual({ type: 'reset_to_top' });
  });

  it('scrollToTop takes priority over an empty message list', () => {
    const action = resolveAutoScrollAction({
      messages: [],
      options: { scrollToTop: 0 },
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action.type).toBe('scroll_to_top');
  });

  it('returns pin_message for a qualifying (isPinnable) message not yet pinned', () => {
    const messages = [
      // index 0 placeholder — never a pin target (see "skips index 0" below)
      createPortableMessage({ id: 'ui-0' }),
      createPortableMessage({
        id: 'req-1',
        element: stubElement,
        isPinnable: true,
      }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: 'pin_message' }>;
    expect(action.type).toBe('pin_message');
    // The action now carries the PortableMessage itself, not a messageComponent.
    expect(action.message.id).toBe('req-1');
  });

  it('returns recalculate_spacer when the qualifying message is already pinned', () => {
    const messages = [
      createPortableMessage({ id: 'ui-0' }),
      createPortableMessage({
        id: 'req-1',
        element: stubElement,
        isPinnable: true,
      }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: 'req-1', // already pinned
      scrollElement,
    });
    expect(action).toEqual({ type: 'recalculate_spacer' });
  });

  it('returns noop when there is no qualifying message and nothing pinned', () => {
    const messages = [
      createPortableMessage({ id: 'ui-0' }),
      // A non-pinnable response (e.g. reply to a non-silent request).
      createPortableMessage({
        id: 'resp-1',
        element: stubElement,
        isPinnable: false,
        isResponse: true,
      }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action).toEqual({ type: 'noop' });
  });

  it('pins the LAST pinnable message when several qualify', () => {
    const messages = [
      createPortableMessage({ id: 'ui-0' }),
      createPortableMessage({
        id: 'req-1',
        element: stubElement,
        isPinnable: true,
      }),
      createPortableMessage({
        id: 'req-2',
        element: stubElement,
        isPinnable: true,
      }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: 'pin_message' }>;
    expect(action.type).toBe('pin_message');
    expect(action.message.id).toBe('req-2');
  });

  it('does not pin a pinnable message whose element has not mounted yet', () => {
    const messages = [
      createPortableMessage({ id: 'ui-0' }),
      // element still null → treated as "no pin target" (legacy missing-ref behavior).
      createPortableMessage({ id: 'req-1', element: null, isPinnable: true }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action).toEqual({ type: 'noop' });
  });

  it('skips the item at index 0 even if it qualifies', () => {
    // Single-item list: the qualifying message is at index 0 and must be ignored.
    const messages = [
      createPortableMessage({
        id: 'req-1',
        element: stubElement,
        isPinnable: true,
      }),
    ];
    const action = resolveAutoScrollAction({
      messages,
      options: {},
      pinnedMessageId: null,
      scrollElement,
    });
    expect(action).toEqual({ type: 'noop' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pinMessageAndScroll
// ─────────────────────────────────────────────────────────────────────────────

describe('pinMessageAndScroll', () => {
  /**
   * Geometry for the normal (non-tall) test case:
   *
   *   scroller:  top=0,   clientHeight=500, scrollTop=0, scrollHeight=1000
   *   message:   top=100, height=80            (80 < 500 * 0.25 = 125 → NOT tall)
   *   spacer:    top=400
   *
   *   targetOffsetWithinScroller = 100 - 0 + 0 = 100
   *   baseScrollTop = floor(100 + (-60)) = 40   (AUTO_SCROLL_EXTRA = -60)
   *   finalScrollTop = 40                       (no tall adjustment)
   *   spacerOffset = 400 - 0 + 0 = 400
   *   visibleBottom = 40 + 500 = 540
   *   deficit = ceil(540 - 400) = 140
   */
  it('returns null when spacerElem is null', () => {
    const scrollElement = createMockScrollElement() as any;
    const message = createMessageWithRect('m-1', 100, 80);
    const result = pinMessageAndScroll({
      message,
      scrollElement,
      spacerElem: null,
      setSpacerHeight: jest.fn(),
    });
    expect(result).toBeNull();
  });

  it('returns null when the target element is null', () => {
    const scrollElement = createMockScrollElement() as any;
    const spacerElem = createMockSpacer();
    const message = createPortableMessage({ id: 'm-1', element: null });
    const result = pinMessageAndScroll({
      message,
      scrollElement,
      spacerElem,
      setSpacerHeight: jest.fn(),
    });
    expect(result).toBeNull();
  });

  it('writes the correct spacer height and scrollTop for a normal-sized message', () => {
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400);
    const message = createMessageWithRect('m-1', 100, 80);
    const setSpacerHeight = jest.fn();

    const result = pinMessageAndScroll({
      message,
      scrollElement,
      spacerElem,
      setSpacerHeight,
    });

    // Spacer is now written via the injected callback with the deficit.
    expect(setSpacerHeight).toHaveBeenCalledWith(140);
    expect(scrollElement.scrollTop).toBe(40);
    expect(result).toEqual({
      currentSpacerHeight: 140,
      scrollTop: 40,
      pinnedMessageId: 'm-1',
      // lastScrollHeight reflects the scrollElement.scrollHeight at time of call.
      lastScrollHeight: scrollElement.scrollHeight,
    });
  });

  it('adjusts scrollTop past a very tall message to keep the response visible', () => {
    /**
     *   message: top=50, height=200    (200 > 500 * 0.25 = 125 → TALL)
     *
     *   baseScrollTop = floor(50 + (-60)) = -10 → max(0, -10) = 0
     *   tallAdjustment = max(0, 200 - 100) = 100   (VISIBLE_BOTTOM_PORTION_PX = 100)
     *   finalScrollTop = 0 + 100 = 100
     *   spacerOffset = 400
     *   visibleBottom = 100 + 500 = 600
     *   deficit = ceil(600 - 400) = 200
     */
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400);
    const message = createMessageWithRect('m-tall', 50, 200);
    const setSpacerHeight = jest.fn();

    const result = pinMessageAndScroll({
      message,
      scrollElement,
      spacerElem,
      setSpacerHeight,
    });

    expect(setSpacerHeight).toHaveBeenCalledWith(200);
    expect(scrollElement.scrollTop).toBe(100);
    expect(result).toMatchObject({
      currentSpacerHeight: 200,
      scrollTop: 100,
      pinnedMessageId: 'm-tall',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recalculatePinnedMessageSpacer
// ─────────────────────────────────────────────────────────────────────────────

describe('recalculatePinnedMessageSpacer', () => {
  it('returns null when spacerElem is null', () => {
    const scrollElement = createMockScrollElement() as any;
    const pinnedElement = createRectElement(100, 80);
    const result = recalculatePinnedMessageSpacer({
      pinnedElement,
      scrollElement,
      spacerElem: null,
      setSpacerHeight: jest.fn(),
    });
    expect(result).toBeNull();
  });

  it('returns null when pinnedElement is null', () => {
    const scrollElement = createMockScrollElement() as any;
    const spacerElem = createMockSpacer();
    const result = recalculatePinnedMessageSpacer({
      pinnedElement: null,
      scrollElement,
      spacerElem,
      setSpacerHeight: jest.fn(),
    });
    expect(result).toBeNull();
  });

  it('writes the deficit via setSpacerHeight and preserves the current scrollTop', () => {
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400);
    const pinnedElement = createRectElement(100, 80);
    const setSpacerHeight = jest.fn();

    const result = recalculatePinnedMessageSpacer({
      pinnedElement,
      scrollElement,
      spacerElem,
      setSpacerHeight,
    });

    // Spacer deficit is calculated to keep current scrollTop (0) reachable:
    // visibleBottom = scrollTop (0) + clientHeight (500) = 500
    // spacerOffset = spacerRect.top (400) - scrollerRect.top (0) + scrollTop (0) = 400
    // deficit = max(0, ceil(500 - 400)) = 100
    expect(setSpacerHeight).toHaveBeenCalledWith(100);
    expect(result).toEqual({ deficit: 100, scrollTop: 0 });
    // scrollTop is preserved (not updated) — function only ensures spacer is large enough.
    expect(scrollElement.scrollTop).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// misc controller helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('getMessageArrayChangeFlags', () => {
  it('returns false/false when arrays are the same reference and length', () => {
    const items = [createPortableMessage({ id: '1' })];
    expect(
      getMessageArrayChangeFlags({
        oldItems: items,
        newItems: items,
      })
    ).toEqual({ countChanged: false, itemsChanged: false });
  });

  it('returns false/true when arrays differ by reference only', () => {
    const oldItems = [createPortableMessage({ id: '1' })];
    const newItems = [createPortableMessage({ id: '1' })];
    expect(
      getMessageArrayChangeFlags({
        oldItems,
        newItems,
      })
    ).toEqual({ countChanged: false, itemsChanged: true });
  });

  it('returns true/true when lengths differ', () => {
    const oldItems = [createPortableMessage({ id: '1' })];
    const newItems = [
      createPortableMessage({ id: '1' }),
      createPortableMessage({ id: '2' }),
    ];
    expect(
      getMessageArrayChangeFlags({
        oldItems,
        newItems,
      })
    ).toEqual({ countChanged: true, itemsChanged: true });
  });
});

describe('didClearAllMessages', () => {
  it('returns false when there were no previous messages', () => {
    expect(
      didClearAllMessages({
        oldItems: [],
        newItems: [createPortableMessage({ id: 'welcome' })],
      })
    ).toBe(false);
  });

  it('returns true when the list is emptied', () => {
    expect(
      didClearAllMessages({
        oldItems: [createPortableMessage({ id: '1' })],
        newItems: [],
      })
    ).toBe(true);
  });

  it('returns true when every previous message is replaced', () => {
    expect(
      didClearAllMessages({
        oldItems: [
          createPortableMessage({ id: '1' }),
          createPortableMessage({ id: '2' }),
        ],
        newItems: [createPortableMessage({ id: 'welcome' })],
      })
    ).toBe(true);
  });

  it('returns false when a message keeps its id but its rows are rebuilt', () => {
    expect(
      didClearAllMessages({
        oldItems: [createPortableMessage({ id: 'row-a', messageId: 'msg-1' })],
        newItems: [createPortableMessage({ id: 'row-b', messageId: 'msg-1' })],
      })
    ).toBe(false);
  });

  it('returns false when any previous message survives', () => {
    expect(
      didClearAllMessages({
        oldItems: [
          createPortableMessage({ id: '1' }),
          createPortableMessage({ id: '2' }),
        ],
        newItems: [createPortableMessage({ id: '1' })],
      })
    ).toBe(false);
  });
});

describe('streaming state helpers', () => {
  const doneItem = createPortableMessage({ id: 'done', isStreaming: false });
  const activeItem = createPortableMessage({ id: 'active', isStreaming: true });
  const noStreamItem = createPortableMessage({
    id: 'none',
    isStreaming: false,
  });

  it('detects enter/exit transitions', () => {
    expect(
      getStreamingTransition({
        oldItems: [noStreamItem],
        newItems: [activeItem],
      })
    ).toEqual({
      enteredStreaming: true,
      exitedStreaming: false,
      isCurrentlyStreaming: true,
      wasStreaming: false,
    });

    expect(
      getStreamingTransition({
        oldItems: [activeItem],
        newItems: [doneItem],
      })
    ).toEqual({
      enteredStreaming: false,
      exitedStreaming: true,
      isCurrentlyStreaming: false,
      wasStreaming: true,
    });
  });
});

describe('getAnchoringRestoreTarget', () => {
  it('returns null when snapshot is null', () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 50, snapshot: null })
    ).toBeNull();
  });

  it('returns null when scrollTop is not reduced', () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 90, snapshot: 80 })
    ).toBeNull();
  });

  it('returns snapshot when browser decreased scrollTop', () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 40, snapshot: 80 })
    ).toBe(80);
  });
});

describe('resolveStreamEndAction', () => {
  it('treats threshold boundary as near-pin', () => {
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 160,
      })
    ).toBe('re_pin_and_scroll');
  });

  it('returns preserve-scroll when away from pin', () => {
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 161,
      })
    ).toBe('recalculate_and_preserve_scroll');
  });

  it('returns preserve-scroll when the user scrolled UP away from the pin', () => {
    // Regression guard: a one-directional check (`scrollTop <= pin + threshold`)
    // classified any upward scroll as near-pin and yanked it back down. The
    // symmetric distance check treats scroll-up past the threshold as "away".
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 0,
      })
    ).toBe('recalculate_and_preserve_scroll');
  });

  it('re-pins when scrollTop is below the pin but the browser capped it (content shrank)', () => {
    // scrollTop < pin, but it is already at the max reachable scrollTop → this is a
    // browser-initiated cap from a content shrink, not a user scroll, so still re-pin.
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 40,
        maxScrollTop: 40,
      })
    ).toBe('re_pin_and_scroll');
  });
});

describe('resolveUserScrollAway', () => {
  it('latches TRUE for a deliberate scroll-up with room below the current position', () => {
    // scrollTop 0 is well above pin 200 AND far from the bottom (maxScrollTop 400) → the user
    // chose this position, so disengage auto-scroll.
    expect(
      resolveUserScrollAway({
        scrollTop: 0,
        pinnedScrollTop: 200,
        maxScrollTop: 400,
        thresholdPx: 50,
      })
    ).toBe(true);
  });

  it('does NOT latch (returns null) for a browser cap: below the pin but pinned to the bottom', () => {
    // scrollTop 140 is below pin 200 but equals maxScrollTop 140 (no room below) → content
    // shrank and the browser capped scrollTop; this is not a user scroll, so leave the flag.
    expect(
      resolveUserScrollAway({
        scrollTop: 140,
        pinnedScrollTop: 200,
        maxScrollTop: 140,
        thresholdPx: 50,
      })
    ).toBeNull();
  });

  it('clears (returns false) once the user is back at/below the pin', () => {
    expect(
      resolveUserScrollAway({
        scrollTop: 210,
        pinnedScrollTop: 200,
        maxScrollTop: 400,
        thresholdPx: 50,
      })
    ).toBe(false);
  });
});

describe('hasMessagesOutOfView', () => {
  it('subtracts dom spacer from scrollHeight', () => {
    expect(
      hasMessagesOutOfView({
        clientHeight: 500,
        domSpacerHeight: 200,
        scrollHeight: 1500,
        scrollTop: 740,
        thresholdPx: 60,
      })
    ).toBe(false);
    expect(
      hasMessagesOutOfView({
        clientHeight: 500,
        domSpacerHeight: 200,
        scrollHeight: 1500,
        scrollTop: 700,
        thresholdPx: 60,
      })
    ).toBe(true);
  });
});

describe('resolvePublicSpacerReconciliationAction', () => {
  it('returns noop when no pinned message exists', () => {
    expect(
      resolvePublicSpacerReconciliationAction({ pinnedMessageId: null })
    ).toEqual({ type: 'noop' });
  });

  it('returns recalculate action when a pinned message exists', () => {
    expect(
      resolvePublicSpacerReconciliationAction({ pinnedMessageId: 'req-1' })
    ).toEqual({ type: 'recalculate_spacer_preserve_scroll' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasNewNonStreamingResponse
//
// Now driven directly by PortableMessage `isStreaming` / `isResponse` flags: true
// when some message is `!isStreaming && isResponse`.
// ─────────────────────────────────────────────────────────────────────────────

describe('hasNewNonStreamingResponse', () => {
  it('returns true when a non-streaming response is present', () => {
    const messages = [
      createPortableMessage({
        id: 'resp-1',
        isStreaming: false,
        isResponse: true,
      }),
    ];
    expect(hasNewNonStreamingResponse(messages)).toBe(true);
  });

  it('returns false when only streaming responses are present', () => {
    const messages = [
      createPortableMessage({
        id: 'resp-1',
        isStreaming: true,
        isResponse: true,
      }),
    ];
    expect(hasNewNonStreamingResponse(messages)).toBe(false);
  });

  it('returns false when only request messages are present', () => {
    const messages = [
      createPortableMessage({
        id: 'req-1',
        isStreaming: false,
        isResponse: false,
      }),
    ];
    expect(hasNewNonStreamingResponse(messages)).toBe(false);
  });

  it('returns false when the message list is empty', () => {
    expect(hasNewNonStreamingResponse([])).toBe(false);
  });

  it('returns true when mixed messages include at least one non-streaming response', () => {
    const messages = [
      createPortableMessage({
        id: 'req-1',
        isStreaming: false,
        isResponse: false,
      }),
      createPortableMessage({
        id: 'resp-1',
        isStreaming: true,
        isResponse: true,
      }),
      createPortableMessage({
        id: 'resp-2',
        isStreaming: false,
        isResponse: true,
      }),
    ];
    expect(hasNewNonStreamingResponse(messages)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applySafariScrollAnchoringRestore
// ─────────────────────────────────────────────────────────────────────────────

describe('applySafariScrollAnchoringRestore', () => {
  it('returns restore target when snapshot differs from current scrollTop', () => {
    expect(applySafariScrollAnchoringRestore(100, 150)).toBe(150);
  });

  it('returns null when snapshot is null', () => {
    expect(applySafariScrollAnchoringRestore(100, null)).toBeNull();
  });

  it('returns null when snapshot equals current scrollTop', () => {
    expect(applySafariScrollAnchoringRestore(100, 100)).toBeNull();
  });

  it('handles scroll position decrease from Safari anchoring', () => {
    expect(applySafariScrollAnchoringRestore(50, 100)).toBe(100);
  });

  it('returns null when scroll position increases', () => {
    expect(applySafariScrollAnchoringRestore(150, 100)).toBeNull();
  });

  it('handles zero scroll positions correctly', () => {
    expect(applySafariScrollAnchoringRestore(0, 0)).toBeNull();
  });

  it('handles large scroll values correctly', () => {
    expect(applySafariScrollAnchoringRestore(5000, 5100)).toBe(5100);
  });
});

/**
 * Builds a fake scroll container backed by a real detached <div> so that
 * addEventListener/removeEventListener and dispatchEvent behave for real, while
 * scrollTop / clientHeight / scrollHeight / offsetHeight / getBoundingClientRect
 * are controllable stubs (jsdom does not lay elements out).
 */
function createFakeContainer(
  geom: Partial<{
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    offsetHeight: number;
    rectTop: number;
  }> = {}
) {
  const {
    scrollTop = 0,
    clientHeight = 500,
    scrollHeight = 2000,
    offsetHeight = 500,
    rectTop = 0,
  } = geom;

  const el = document.createElement('div');
  let currentScrollTop = scrollTop;

  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => currentScrollTop,
    set: (v: number) => {
      currentScrollTop = v;
    },
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(el, 'offsetHeight', {
    configurable: true,
    get: () => offsetHeight,
  });
  Object.defineProperty(el, 'isConnected', {
    configurable: true,
    get: () => true,
  });
  el.getBoundingClientRect = () =>
    ({ top: rectTop, height: clientHeight }) as DOMRect;

  return el;
}

/**
 * A controllable ScrollHost with a real container element, a fake spacer, a
 * setSpacerHeight jest.fn recording heights, and a swappable message list.
 */
function createHarness(geom?: Parameters<typeof createFakeContainer>[0]) {
  const container = createFakeContainer(geom);
  const spacer = createMockSpacer(400);
  const setSpacerHeight = jest.fn<void, [number]>();
  let messages: PortableMessage[] = [];

  const host: ScrollHost = {
    getScrollContainer: () => container,
    getSpacer: () => spacer,
    setSpacerHeight,
    setScrollHeightFloor: jest.fn(),
    getMessages: () => messages,
    onScrollGeometryChanged: jest.fn(),
  };

  return {
    container,
    spacer,
    setSpacerHeight,
    host,
    onScrollGeometryChanged: host.onScrollGeometryChanged as jest.Mock,
    setMessages: (next: PortableMessage[]) => {
      messages = next;
    },
  };
}

/**
 * Like createMessageWithRect but backs the element with a REAL detached <div> so
 * that DOM APIs the controller touches during the full pin flow work — notably
 * `querySelector` (waitForMessageComponentLayout looks for a nested markdown
 * element; there is none, so it resolves fast) and event bubbling for the settle
 * test. Only the class-level tests exercise that full path.
 */
function createRealPinnableMessage(
  id: string,
  rectTop: number,
  rectHeight: number
): PortableMessage {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ top: rectTop, height: rectHeight }) as DOMRect;
  return createPortableMessage({ id, element, isPinnable: true });
}

/** Flush a single animation frame (jsdom provides rAF). */
function flushRaf(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Flush several animation frames + their trailing microtasks. The pin path chains
 * multiple nested rAFs (scheduleAutoScroll → waitForMessageComponentLayout →
 * executePinAndScroll), each of which registers its follow-up in the NEXT frame, so
 * a handful of pumps is needed for the whole async chain to settle in jsdom.
 */
async function flushFrames(count = 8): Promise<void> {
  for (let i = 0; i < count; i++) {
    await flushRaf();
  }
}

describe('MessagesScrollController', () => {
  it('isScrolledAwayFromBottom() reflects hasMessagesOutOfView using the tracked domSpacerHeight', () => {
    // domSpacerHeight starts at 0 (nothing pinned). With scrollHeight 2000,
    // clientHeight 500, scrollTop 0: remaining = 2000 - 0 - 0 - 500 = 1500 > 60 → true.
    const away = createHarness({
      scrollHeight: 2000,
      clientHeight: 500,
      scrollTop: 0,
    });
    const controllerAway = new MessagesScrollController(away.host);
    expect(controllerAway.isScrolledAwayFromBottom()).toBe(true);

    // At the bottom: scrollTop 1500 → remaining = 2000 - 1500 - 500 = 0 ≤ 60 → false.
    const atBottom = createHarness({
      scrollHeight: 2000,
      clientHeight: 500,
      scrollTop: 1500,
    });
    const controllerBottom = new MessagesScrollController(atBottom.host);
    expect(controllerBottom.isScrolledAwayFromBottom()).toBe(false);
  });

  it('isScrolledAwayFromBottom() returns false when there is no scroll container', () => {
    const host: ScrollHost = {
      getScrollContainer: () => null,
      getSpacer: () => null,
      setSpacerHeight: jest.fn(),
      setScrollHeightFloor: jest.fn(),
      getMessages: () => [],
      onScrollGeometryChanged: jest.fn(),
    };
    const controller = new MessagesScrollController(host);
    expect(controller.isScrolledAwayFromBottom()).toBe(false);
  });

  it('getContainerScrollBottom() === scrollHeight - offsetHeight - scrollTop', () => {
    const h = createHarness({
      scrollHeight: 2000,
      offsetHeight: 500,
      scrollTop: 300,
    });
    const controller = new MessagesScrollController(h.host);
    // 2000 - 500 - 300 = 1200
    expect(controller.getContainerScrollBottom()).toBe(1200);
  });

  it("doScrollToMessageElement(element, animate) sets scrollTop toward the element's offsetTop", () => {
    const h = createHarness({ scrollTop: 0 });
    const controller = new MessagesScrollController(h.host);

    const messageElement = document.createElement('div');
    Object.defineProperty(messageElement, 'offsetTop', {
      configurable: true,
      get: () => 777,
    });

    controller.doScrollToMessageElement(messageElement, false);
    expect(h.container.scrollTop).toBe(777);
  });

  it('doScrollToMessageElement(null) is a no-op and does not throw', () => {
    const h = createHarness({ scrollTop: 42 });
    const controller = new MessagesScrollController(h.host);
    expect(() => controller.doScrollToMessageElement(null)).not.toThrow();
    expect(h.container.scrollTop).toBe(42);
  });

  it('onHostUpdated pin flow: after connect() + a count-changing update, pins the last pinnable message (spacer written, scrollTop moved)', async () => {
    // Container geometry chosen so the pin math produces a positive scrollTop and spacer deficit.
    const h = createHarness({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
      offsetHeight: 500,
      rectTop: 0,
    });

    // A pinnable last message whose element reports a rect that pins to a non-zero scrollTop.
    // message top=200 → base scrollTop = floor(200 - 60) = 140; not tall (80 < 125).
    const pinnable = createRealPinnableMessage('req-1', 200, 80);
    // Placeholder at index 0 (never a pin target) + the pinnable target.
    const placeholder = createPortableMessage({ id: 'ui-0' });

    const controller = new MessagesScrollController(h.host);

    // connect() seeds previousMessages with the CURRENT getMessages() result.
    // Start empty so the first onHostUpdated sees a count change.
    h.setMessages([]);
    controller.connect();

    // Now the host reports the two messages → count changed from 0 to 2.
    h.setMessages([placeholder, pinnable]);
    controller.onHostUpdated(null);

    // handleCountChanged → doAutoScrollInternal schedules on rAF; pin runs after
    // waitForMessageComponentLayout (no markdown child → resolves immediately, then one rAF).
    await flushFrames();

    // The controller should have pinned: spacer written and container scrolled.
    expect(h.setSpacerHeight).toHaveBeenCalled();
    // deficit = ceil((floor(200-60)=140 + clientHeight 500) - spacerOffset(400)) = 240
    expect(h.setSpacerHeight).toHaveBeenCalledWith(240);
    expect(h.container.scrollTop).toBe(140);

    controller.disconnect();
  });

  it('restart: replacing every message resets the pin, zeroes the spacer, and scrolls to the top', async () => {
    const h = createHarness({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
      offsetHeight: 500,
      rectTop: 0,
    });

    const pinnable = createRealPinnableMessage('req-1', 200, 80);
    const placeholder = createPortableMessage({ id: 'ui-0' });

    const controller = new MessagesScrollController(h.host);
    h.setMessages([]);
    controller.connect();

    h.setMessages([placeholder, pinnable]);
    controller.onHostUpdated(null);
    await flushFrames();
    expect(h.container.scrollTop).toBe(140); // pin

    // Restart and the welcome message land before the next frame, so the host never
    // commits an empty list.
    h.setSpacerHeight.mockClear();
    h.setMessages([createPortableMessage({ id: 'welcome' })]);
    controller.onHostUpdated(null);
    await flushFrames();

    expect(h.container.scrollTop).toBe(0);
    expect(h.setSpacerHeight).toHaveBeenLastCalledWith(0);

    // The next request in the new conversation still pins.
    h.setMessages([
      createPortableMessage({ id: 'welcome' }),
      createRealPinnableMessage('req-2', 200, 80),
    ]);
    controller.onHostUpdated(null);
    await flushFrames();

    expect(h.container.scrollTop).toBe(140);

    controller.disconnect();
  });

  it('restart during a pending pin does not restore the old pin', async () => {
    const h = createHarness({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
      offsetHeight: 500,
      rectTop: 0,
    });

    // The pin waits on the nested markdown render; hold it open until after the restart.
    const pinnable = createRealPinnableMessage('req-1', 200, 80);
    let finishMarkdown: () => void = () => {};
    const markdown = document.createElement('cds-aichat-markdown');
    Object.defineProperty(markdown, 'updateComplete', {
      value: new Promise<void>((resolve) => {
        finishMarkdown = resolve;
      }),
    });
    pinnable.element?.appendChild(markdown);

    const controller = new MessagesScrollController(h.host);
    h.setMessages([]);
    controller.connect();

    h.setMessages([createPortableMessage({ id: 'ui-0' }), pinnable]);
    controller.onHostUpdated(null);
    await flushFrames();

    h.setMessages([createPortableMessage({ id: 'welcome' })]);
    controller.onHostUpdated(null);
    finishMarkdown();
    await flushFrames();

    expect(h.container.scrollTop).toBe(0);
    expect(h.setSpacerHeight).toHaveBeenLastCalledWith(0);

    controller.disconnect();
  });

  it('removing only the pinned message keeps the scroll position', async () => {
    const h = createHarness({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
      offsetHeight: 500,
      rectTop: 0,
    });

    const pinnable = createRealPinnableMessage('req-1', 200, 80);
    const placeholder = createPortableMessage({ id: 'ui-0' });

    const controller = new MessagesScrollController(h.host);
    h.setMessages([]);
    controller.connect();

    h.setMessages([placeholder, pinnable]);
    controller.onHostUpdated(null);
    await flushFrames();
    expect(h.container.scrollTop).toBe(140); // pin

    h.setMessages([placeholder]);
    controller.onHostUpdated(null);
    await flushFrames();

    expect(h.container.scrollTop).toBe(140);

    controller.disconnect();
  });
});

describe('message resize observation', () => {
  let observers: Array<{
    callback: ResizeObserverCallback;
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  }>;

  beforeEach(() => {
    observers = [];
    jest.spyOn(global, 'ResizeObserver').mockImplementation((callback) => {
      const observer = {
        callback,
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
      observers.push(observer);
      return observer;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createResizeHarness(streaming = false) {
    const harness = createHarness();
    let contentHeight = 1000;
    let requestTop = 360;
    let spacerHeight = 0;
    let scrollHeightFloor = 0;
    let scrollTop = 0;
    (harness.host.setScrollHeightFloor as jest.Mock).mockImplementation(
      (height) => {
        scrollHeightFloor = height;
      }
    );
    Object.defineProperties(harness.container, {
      scrollHeight: {
        get: () =>
          Math.max(500, scrollHeightFloor, contentHeight + spacerHeight),
      },
      scrollTop: {
        get: () => {
          scrollTop = Math.min(scrollTop, harness.container.scrollHeight - 500);
          return scrollTop;
        },
        set: (value: number) => {
          scrollTop = Math.max(
            0,
            Math.min(value, harness.container.scrollHeight - 500)
          );
        },
      },
    });
    harness.spacer.getBoundingClientRect = () =>
      ({ top: contentHeight - harness.container.scrollTop }) as DOMRect;
    harness.setSpacerHeight.mockImplementation((height) => {
      spacerHeight = height;
    });
    const request = createRealPinnableMessage('request', 360, 40);
    request.element.getBoundingClientRect = () =>
      ({
        top: requestTop - harness.container.scrollTop,
        height: 40,
      }) as DOMRect;
    const response = createPortableMessage({
      id: 'response',
      element: document.createElement('div'),
      isResponse: true,
      isStreaming: streaming,
    });
    const messages = [
      createPortableMessage({
        id: 'welcome',
        element: document.createElement('div'),
      }),
      request,
      response,
    ];
    harness.setMessages(messages);
    const controller = new MessagesScrollController(harness.host);
    controller.connect();
    controller.doAutoScrollInternal();
    await flushFrames();
    expect(harness.container.scrollTop).toBe(300);
    const deliver = (height: number, target = response.element) => {
      const observer = observers[1];
      observer.callback(
        [
          { target, borderBoxSize: [{ blockSize: height }] },
        ] as unknown as ResizeObserverEntry[],
        observer
      );
    };
    return {
      ...harness,
      controller,
      messages,
      response,
      request,
      deliver,
      resizeEarlierContent: (delta: number) => {
        contentHeight += delta;
        requestTop += delta;
      },
      resizeContent: (height: number) => {
        contentHeight = height;
      },
      getSpacerHeight: () => spacerHeight,
    };
  }

  it('preserves a deep shrink and reconciles its first resize delivery', async () => {
    const h = await createResizeHarness();
    h.resizeContent(420);
    expect(h.container.scrollTop).toBe(300);
    h.deliver(20);
    expect(h.container.scrollTop).toBe(300);
    expect(h.getSpacerHeight()).toBe(380);
    h.controller.disconnect();
  });

  it('prevents clamping when content shrinks and regrows before a resize delivery', async () => {
    const h = await createResizeHarness();
    h.deliver(600);
    h.resizeContent(420);
    expect(h.container.scrollTop).toBe(300);
    h.resizeContent(1000);
    h.container.dispatchEvent(new Event('scroll'));
    h.deliver(600);
    expect(h.container.scrollTop).toBe(300);
    expect(h.getSpacerHeight()).toBe(0);
    h.controller.disconnect();
    expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(0);
  });

  it('refreshes the floor on container resize and releases it on conversation clear', async () => {
    const h = await createResizeHarness();
    Object.defineProperty(h.container, 'clientHeight', { get: () => 600 });
    h.controller.onContainerResize();
    expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(900);
    await flushFrames();
    h.setMessages([]);
    h.controller.onHostUpdated(300);
    expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(0);
    h.controller.disconnect();
  });

  it('reconciles growth and small shrinks after streaming has completed', async () => {
    const h = await createResizeHarness();
    h.resizeContent(420);
    h.deliver(20);
    h.resizeContent(419);
    h.deliver(19);
    expect(h.container.scrollTop).toBe(300);
    expect(h.getSpacerHeight()).toBe(381);
    h.resizeContent(900);
    h.deliver(500);
    expect(h.getSpacerHeight()).toBe(0);
    expect(h.container.scrollTop).toBe(300);
    expect(h.onScrollGeometryChanged).toHaveBeenCalled();
    h.controller.disconnect();
  });

  it.each([false, true])(
    'preserves the request offset when earlier content resizes (streaming: %s)',
    async (streaming) => {
      const h = await createResizeHarness(streaming);
      const earlier = h.messages[0].element;
      h.resizeContent(420);
      h.deliver(20);
      for (const delta of [250, -180]) {
        h.resizeEarlierContent(delta);
        h.container.dispatchEvent(new Event('scroll'));
        h.deliver(360 + delta, earlier);
        expect(h.request.element.getBoundingClientRect().top).toBe(60);
        expect(h.getSpacerHeight()).toBe(380);
      }
      h.controller.disconnect();
    }
  );

  it('keeps following when native anchoring moves the scroll position with an earlier row', async () => {
    const h = await createResizeHarness();
    const earlier = h.messages[0].element;
    h.deliver(360, earlier);
    h.resizeEarlierContent(-200);
    h.container.scrollTop = 100;
    h.container.dispatchEvent(new Event('scroll'));
    h.deliver(160, earlier);
    expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(600);
    expect(h.request.element.getBoundingClientRect().top).toBe(60);
    h.resizeEarlierContent(250);
    h.deliver(410, earlier);
    expect(h.container.scrollTop).toBe(350);
    expect(h.request.element.getBoundingClientRect().top).toBe(60);
    h.controller.disconnect();
  });

  it('leaves the user away from the pin when an earlier row resizes', async () => {
    const h = await createResizeHarness();
    h.container.scrollTop = 100;
    h.container.dispatchEvent(new Event('scroll'));
    h.resizeEarlierContent(250);
    h.deliver(610, h.messages[0].element);
    expect(h.container.scrollTop).toBe(100);
    expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(0);
    h.controller.disconnect();
  });

  it('keeps the spacer grow-only during streaming', async () => {
    const h = await createResizeHarness(true);
    h.resizeContent(420);
    h.deliver(20);
    h.resizeContent(900);
    h.deliver(500);
    expect(h.getSpacerHeight()).toBe(380);
    expect(h.container.scrollTop).toBe(300);
    h.controller.disconnect();
  });

  it.each([100, 240])(
    'does not restore the pin after the user scrolls to %ipx and content shrinks',
    async (scrollTop) => {
      const h = await createResizeHarness();
      h.deliver(600);
      h.container.scrollTop = scrollTop;
      h.container.dispatchEvent(new Event('scroll'));
      expect(h.host.setScrollHeightFloor).toHaveBeenLastCalledWith(0);
      h.resizeContent(420);
      h.deliver(20);
      expect(h.container.scrollTop).toBe(0);
      expect(h.getSpacerHeight()).toBe(80);
      h.controller.disconnect();
    }
  );

  it('preserves a scroll-away position before its scroll event arrives', async () => {
    const h = await createResizeHarness();
    h.deliver(600);
    h.container.scrollTop = 100;
    h.resizeContent(900);
    h.deliver(500);
    expect(h.container.scrollTop).toBe(100);
    h.controller.disconnect();
  });

  it('reconciles replacement rows on first delivery and stops observing removed rows', async () => {
    const h = await createResizeHarness();
    h.deliver(600);
    const replacement = document.createElement('div');
    h.setMessages([
      ...h.messages.slice(0, -1),
      { ...h.response, element: replacement },
    ]);
    h.controller.onHostUpdated(300);
    expect(observers[1].unobserve).toHaveBeenCalledWith(h.response.element);
    expect(observers[1].observe).toHaveBeenCalledWith(replacement, {
      box: 'border-box',
    });
    h.resizeContent(420);
    h.deliver(20, replacement);
    expect(h.container.scrollTop).toBe(300);
    expect(h.getSpacerHeight()).toBe(380);
    h.controller.disconnect();
    h.setSpacerHeight.mockClear();
    h.deliver(50, replacement);
    expect(h.setSpacerHeight).not.toHaveBeenCalled();
  });
});
