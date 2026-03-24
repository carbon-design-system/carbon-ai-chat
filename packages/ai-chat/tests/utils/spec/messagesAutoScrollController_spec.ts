/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  applySafariScrollAnchoringRestore,
  getAnchoringRestoreTarget,
  getMessageArrayChangeFlags,
  getStreamingTransition,
  hasMessagesOutOfView,
  hasNewNonStreamingResponse,
  pinMessageAndScroll,
  recalculatePinnedMessageSpacer,
  resolveAutoScrollAction,
  resolvePublicSpacerReconciliationAction,
  resolveStreamEndAction,
  type AutoScrollAction,
} from "../../../src/chat/utils/messagesAutoScrollController";

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal scroll-element mock with writable scrollTop so tests can
 * assert that pinMessageAndScroll / handleStreamingChunk write the right value.
 */
function createMockScrollElement(
  overrides: Partial<{
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    offsetHeight: number;
    rectTop: number;
  }> = {},
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
 * Creates a minimal spacer element mock with writable style.minBlockSize.
 */
function createMockSpacer(rectTop = 400) {
  return {
    style: { minBlockSize: "" },
    getBoundingClientRect: () => ({ top: rectTop }) as DOMRect,
  };
}

/**
 * Creates a mock message component whose ref.current has a specific bounding rect.
 * Passed as `messageComponent` to pinMessageAndScroll / recalculatePinnedMessageSpacer.
 */
function createMockMessageComponent(rectTop: number, rectHeight: number) {
  const targetElem = {
    getBoundingClientRect: () =>
      ({ top: rectTop, height: rectHeight }) as DOMRect,
  };
  return { ref: { current: targetElem } } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveAutoScrollAction
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveAutoScrollAction", () => {
  // Minimal mock objects shared across cases.
  const scrollElement = createMockScrollElement({
    scrollHeight: 2000,
    offsetHeight: 500,
  }) as any;

  // A qualifying request message: has `input` property → isRequest() returns true.
  const mockRequest = {
    id: "req-1",
    input: { text: "hello" },
    history: { silent: false },
  } as any;

  // A request with silent:true (e.g. welcome node). Its response qualifies for pinning.
  const mockSilentRequest = {
    id: "req-2",
    input: { text: "" },
    history: { silent: true },
  } as any;

  // A response to a normal (non-silent) request: has `output` → isResponse() returns true.
  const mockResponse = {
    id: "resp-1",
    output: { generic: [] },
    request_id: "req-1",
  } as any;

  // A response to the silent request — should qualify as a scroll target.
  const mockSilentResponse = {
    id: "resp-2",
    output: { generic: [] },
    request_id: "req-2",
  } as any;

  // Index-0 placeholder — findLastScrollableMessage skips index 0 by design.
  const placeholder = {
    ui_state: { id: "ui-0" },
    fullMessageID: "placeholder",
  } as any;

  const mockMessageComponent = {} as any;

  it("returns scroll_to_top when scrollToTop option is provided", () => {
    const action = resolveAutoScrollAction({
      allMessagesByID: {},
      localMessageItems: [],
      messageRefs: new Map(),
      options: { scrollToTop: 350 },
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action).toEqual({ type: "scroll_to_top", scrollTop: 350 });
  });

  it("returns scroll_to_bottom with computed scrollTop when scrollToBottom option is provided", () => {
    const action = resolveAutoScrollAction({
      allMessagesByID: {},
      localMessageItems: [],
      messageRefs: new Map(),
      options: { scrollToBottom: 0 },
      pinnedMessageComponent: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: "scroll_to_bottom" }>;
    // scrollTop = scrollHeight - offsetHeight - scrollToBottom = 2000 - 500 - 0 = 1500
    expect(action.type).toBe("scroll_to_bottom");
    expect(action.scrollTop).toBe(1500);
    expect(action.preferAnimate).toBe(false);
  });

  it("passes preferAnimate through on scroll_to_bottom", () => {
    const action = resolveAutoScrollAction({
      allMessagesByID: {},
      localMessageItems: [],
      messageRefs: new Map(),
      options: { scrollToBottom: 0, preferAnimate: true },
      pinnedMessageComponent: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: "scroll_to_bottom" }>;
    expect(action.preferAnimate).toBe(true);
  });

  it("returns reset_to_top when localMessageItems is empty and no override is provided", () => {
    const action = resolveAutoScrollAction({
      allMessagesByID: {},
      localMessageItems: [],
      messageRefs: new Map(),
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action).toEqual({ type: "reset_to_top" });
  });

  it("scrollToTop takes priority over an empty message list", () => {
    const action = resolveAutoScrollAction({
      allMessagesByID: {},
      localMessageItems: [],
      messageRefs: new Map(),
      options: { scrollToTop: 0 },
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action.type).toBe("scroll_to_top");
  });

  it("returns pin_message for a qualifying request message not yet pinned", () => {
    const messageRefs = new Map([["ui-req-1", mockMessageComponent]]);
    const localMessageItems = [
      placeholder,
      { ui_state: { id: "ui-req-1" }, fullMessageID: "req-1" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: { "req-1": mockRequest },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: "pin_message" }>;
    expect(action.type).toBe("pin_message");
    expect(action.messageComponent).toBe(mockMessageComponent);
  });

  it("returns recalculate_spacer when the qualifying message is already pinned", () => {
    const messageRefs = new Map([["ui-req-1", mockMessageComponent]]);
    const localMessageItems = [
      placeholder,
      { ui_state: { id: "ui-req-1" }, fullMessageID: "req-1" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: { "req-1": mockRequest },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: mockMessageComponent, // already pinned
      scrollElement,
    });
    expect(action).toEqual({ type: "recalculate_spacer" });
  });

  it("returns noop when there is no qualifying message and no pinned component", () => {
    // A response whose parent request is NOT silent does not qualify for pinning.
    const messageRefs = new Map([["ui-resp-1", mockMessageComponent]]);
    const localMessageItems = [
      placeholder,
      { ui_state: { id: "ui-resp-1" }, fullMessageID: "resp-1" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: { "req-1": mockRequest, "resp-1": mockResponse },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action).toEqual({ type: "noop" });
  });

  it("qualifies a response to a silent request as a pin target", () => {
    const messageRefs = new Map([["ui-resp-2", mockMessageComponent]]);
    const localMessageItems = [
      placeholder,
      { ui_state: { id: "ui-resp-2" }, fullMessageID: "resp-2" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: {
        "req-2": mockSilentRequest,
        "resp-2": mockSilentResponse,
      },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    }) as Extract<AutoScrollAction, { type: "pin_message" }>;
    expect(action.type).toBe("pin_message");
    expect(action.messageComponent).toBe(mockMessageComponent);
  });

  it("does not qualify a response to a non-silent request as a pin target", () => {
    // Even if the message component is in messageRefs, the response is not pinnable.
    const messageRefs = new Map([["ui-resp-1", mockMessageComponent]]);
    const localMessageItems = [
      placeholder,
      { ui_state: { id: "ui-resp-1" }, fullMessageID: "resp-1" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: { "req-1": mockRequest, "resp-1": mockResponse },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action).toEqual({ type: "noop" });
  });

  it("skips the item at index 0 even if it qualifies", () => {
    // Single-item list: the qualifying request is at index 0 and must be ignored.
    const messageRefs = new Map([["ui-req-1", mockMessageComponent]]);
    const localMessageItems = [
      { ui_state: { id: "ui-req-1" }, fullMessageID: "req-1" } as any,
    ];
    const action = resolveAutoScrollAction({
      allMessagesByID: { "req-1": mockRequest },
      localMessageItems,
      messageRefs,
      options: {},
      pinnedMessageComponent: null,
      scrollElement,
    });
    expect(action).toEqual({ type: "noop" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pinMessageAndScroll
// ─────────────────────────────────────────────────────────────────────────────

describe("pinMessageAndScroll", () => {
  /**
   * Geometry for the normal (non-tall) test case:
   *
   *   scroller:  top=0,   clientHeight=500, scrollTop=0, scrollHeight=1000
   *   message:   top=100, height=80            (80 < 500 * 0.25 = 125 → NOT tall)
   *   spacer:    top=400
   *
   *   targetOffsetWithinScroller = 100 - 0 + 0 = 100
   *   baseScrollTop = floor(100 + 20) = 120     (AUTO_SCROLL_EXTRA = 20)
   *   finalScrollTop = 120                      (no tall adjustment)
   *   spacerOffset = 400 - 0 + 0 = 400
   *   visibleBottom = 120 + 500 = 620
   *   deficit = ceil(620 - 400) = 220
   */
  it("returns null when spacerElem is null", () => {
    const scrollElement = createMockScrollElement() as any;
    const messageComponent = createMockMessageComponent(100, 80);
    const result = pinMessageAndScroll({
      messageComponent,
      scrollElement,
      spacerElem: null,
    });
    expect(result).toBeNull();
  });

  it("returns null when the target element ref is null", () => {
    const scrollElement = createMockScrollElement() as any;
    const spacerElem = createMockSpacer() as any;
    const messageComponent = { ref: { current: null } } as any;
    const result = pinMessageAndScroll({
      messageComponent,
      scrollElement,
      spacerElem,
    });
    expect(result).toBeNull();
  });

  it("writes the correct spacer height and scrollTop for a normal-sized message", () => {
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400) as any;
    const messageComponent = createMockMessageComponent(100, 80);

    const result = pinMessageAndScroll({
      messageComponent,
      scrollElement,
      spacerElem,
    });

    expect(spacerElem.style.minBlockSize).toBe("220px");
    expect(scrollElement.scrollTop).toBe(120);
    expect(result).not.toBeNull();
    expect(result.currentSpacerHeight).toBe(220);
    expect(result.scrollTop).toBe(120);
    expect(result.pinnedMessageComponent).toBe(messageComponent);
    // lastScrollHeight reflects the scrollElement.scrollHeight at time of call.
    expect(result.lastScrollHeight).toBe(scrollElement.scrollHeight);
  });

  it("adjusts scrollTop past a very tall message to keep the response visible", () => {
    /**
     *   message: top=50, height=200    (200 > 500 * 0.25 = 125 → TALL)
     *
     *   baseScrollTop = floor(50 + 20) = 70
     *   tallAdjustment = max(0, 200 - 100) = 100   (VISIBLE_BOTTOM_PORTION_PX = 100)
     *   finalScrollTop = 70 + 100 = 170
     *   spacerOffset = 400
     *   visibleBottom = 170 + 500 = 670
     *   deficit = ceil(670 - 400) = 270
     */
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400) as any;
    const messageComponent = createMockMessageComponent(50, 200);

    const result = pinMessageAndScroll({
      messageComponent,
      scrollElement,
      spacerElem,
    });

    expect(spacerElem.style.minBlockSize).toBe("270px");
    expect(scrollElement.scrollTop).toBe(170);
    expect(result.currentSpacerHeight).toBe(270);
    expect(result.scrollTop).toBe(170);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recalculatePinnedMessageSpacer
// ─────────────────────────────────────────────────────────────────────────────

describe("recalculatePinnedMessageSpacer", () => {
  /**
   * Same geometry as the pinMessageAndScroll normal case (deficit = 220).
   * The difference: scrollTop is not written, only the spacer.
   */

  it("returns null when spacerElem is null", () => {
    const scrollElement = createMockScrollElement() as any;
    const pinnedMessageComponent = createMockMessageComponent(100, 80);
    const result = recalculatePinnedMessageSpacer({
      pinnedMessageComponent,
      scrollElement,
      spacerElem: null,
    });
    expect(result).toBeNull();
  });

  it("returns null when pinnedMessageComponent is null", () => {
    const scrollElement = createMockScrollElement() as any;
    const spacerElem = createMockSpacer() as any;
    const result = recalculatePinnedMessageSpacer({
      pinnedMessageComponent: null,
      scrollElement,
      spacerElem,
    });
    expect(result).toBeNull();
  });

  it("writes the correct spacer height and returns the value, preserving current scrollTop", () => {
    const scrollElement = createMockScrollElement({
      scrollTop: 0,
      clientHeight: 500,
      scrollHeight: 1000,
    }) as any;
    const spacerElem = createMockSpacer(400) as any;
    const pinnedMessageComponent = createMockMessageComponent(100, 80);

    const result = recalculatePinnedMessageSpacer({
      pinnedMessageComponent,
      scrollElement,
      spacerElem,
    });

    // Spacer deficit is calculated to keep current scrollTop (0) reachable:
    // visibleBottom = scrollTop (0) + clientHeight (500) = 500
    // spacerOffset = spacerRect.top (400) - scrollerRect.top (0) + scrollTop (0) = 400
    // deficit = max(0, ceil(500 - 400)) = 100
    expect(spacerElem.style.minBlockSize).toBe("100px");
    expect(result).toEqual({ deficit: 100, scrollTop: 0 });
    // scrollTop is preserved (not updated) - function only ensures spacer is large enough
    expect(scrollElement.scrollTop).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// misc controller helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessageArrayChangeFlags", () => {
  it("returns false/false when arrays are the same reference and length", () => {
    const items = [{ ui_state: { id: "1" } }] as any;
    expect(
      getMessageArrayChangeFlags({
        oldItems: items,
        newItems: items,
      }),
    ).toEqual({ countChanged: false, itemsChanged: false });
  });

  it("returns false/true when arrays differ by reference only", () => {
    const oldItems = [{ ui_state: { id: "1" } }] as any;
    const newItems = [{ ui_state: { id: "1" } }] as any;
    expect(
      getMessageArrayChangeFlags({
        oldItems,
        newItems,
      }),
    ).toEqual({ countChanged: false, itemsChanged: true });
  });

  it("returns true/true when lengths differ", () => {
    const oldItems = [{ ui_state: { id: "1" } }] as any;
    const newItems = [
      { ui_state: { id: "1" } },
      { ui_state: { id: "2" } },
    ] as any;
    expect(
      getMessageArrayChangeFlags({
        oldItems,
        newItems,
      }),
    ).toEqual({ countChanged: true, itemsChanged: true });
  });
});

describe("streaming state helpers", () => {
  const doneItem = {
    ui_state: { streamingState: { isDone: true } },
  } as any;
  const activeItem = {
    ui_state: { streamingState: { isDone: false } },
  } as any;
  const noStreamItem = { ui_state: { streamingState: undefined } } as any;

  it("detects enter/exit transitions", () => {
    expect(
      getStreamingTransition({
        oldItems: [noStreamItem] as any,
        newItems: [activeItem] as any,
      }),
    ).toEqual({
      enteredStreaming: true,
      exitedStreaming: false,
      isCurrentlyStreaming: true,
      wasStreaming: false,
    });

    expect(
      getStreamingTransition({
        oldItems: [activeItem] as any,
        newItems: [doneItem] as any,
      }),
    ).toEqual({
      enteredStreaming: false,
      exitedStreaming: true,
      isCurrentlyStreaming: false,
      wasStreaming: true,
    });
  });
});

describe("getAnchoringRestoreTarget", () => {
  it("returns null when snapshot is null", () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 50, snapshot: null }),
    ).toBeNull();
  });

  it("returns null when scrollTop is not reduced", () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 90, snapshot: 80 }),
    ).toBeNull();
  });

  it("returns snapshot when browser decreased scrollTop", () => {
    expect(
      getAnchoringRestoreTarget({ currentScrollTop: 40, snapshot: 80 }),
    ).toBe(80);
  });
});

describe("resolveStreamEndAction", () => {
  it("treats threshold boundary as near-pin", () => {
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 160,
      }),
    ).toBe("re_pin_and_scroll");
  });

  it("returns preserve-scroll when away from pin", () => {
    expect(
      resolveStreamEndAction({
        nearPinThresholdPx: 60,
        pinnedScrollTop: 100,
        scrollTop: 161,
      }),
    ).toBe("recalculate_and_preserve_scroll");
  });
});

describe("hasMessagesOutOfView", () => {
  it("subtracts dom spacer from scrollHeight", () => {
    expect(
      hasMessagesOutOfView({
        clientHeight: 500,
        domSpacerHeight: 200,
        scrollHeight: 1500,
        scrollTop: 740,
        thresholdPx: 60,
      }),
    ).toBe(false);
    expect(
      hasMessagesOutOfView({
        clientHeight: 500,
        domSpacerHeight: 200,
        scrollHeight: 1500,
        scrollTop: 700,
        thresholdPx: 60,
      }),
    ).toBe(true);
  });
});

describe("resolvePublicSpacerReconciliationAction", () => {
  it("returns noop when no pinned message exists", () => {
    expect(
      resolvePublicSpacerReconciliationAction({ pinnedMessageComponent: null }),
    ).toEqual({ type: "noop" });
  });

  it("returns recalculate action when pinned message exists", () => {
    expect(
      resolvePublicSpacerReconciliationAction({
        pinnedMessageComponent: {} as any,
      }),
    ).toEqual({ type: "recalculate_spacer_preserve_scroll" });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // hasNewNonStreamingResponse
  // ─────────────────────────────────────────────────────────────────────────────

  describe("hasNewNonStreamingResponse", () => {
    it("should return true when a non-streaming response is present", () => {
      const mockResponse = {
        id: "resp-1",
        request_id: "req-1",
        output: { text: "Hello" },
      } as any;

      const localMessageItems = [
        {
          fullMessageID: "resp-1",
          ui_state: {
            id: "ui-1",
            streamingState: undefined,
          },
        },
      ] as any;

      const allMessagesByID = {
        "resp-1": mockResponse,
      };

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(true);
    });

    it("should return false when only streaming responses are present", () => {
      const mockResponse = {
        id: "resp-1",
        request_id: "req-1",
        output: { text: "Hello" },
      } as any;

      const localMessageItems = [
        {
          fullMessageID: "resp-1",
          ui_state: {
            id: "ui-1",
            streamingState: { isDone: false },
          },
        },
      ] as any;

      const allMessagesByID = {
        "resp-1": mockResponse,
      };

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(false);
    });

    it("should return false when only request messages are present", () => {
      const mockRequest = {
        id: "req-1",
        input: { text: "Hello" },
      } as any;

      const localMessageItems = [
        {
          fullMessageID: "req-1",
          ui_state: {
            id: "ui-1",
            streamingState: undefined,
          },
        },
      ] as any;

      const allMessagesByID = {
        "req-1": mockRequest,
      };

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(false);
    });

    it("should return false when message list is empty", () => {
      const localMessageItems = [] as any;
      const allMessagesByID = {};

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(false);
    });

    it("should return true when mixed messages include at least one non-streaming response", () => {
      const mockRequest = {
        id: "req-1",
        input: { text: "Hello" },
      } as any;

      const mockStreamingResponse = {
        id: "resp-1",
        request_id: "req-1",
        output: { text: "Streaming..." },
      } as any;

      const mockNonStreamingResponse = {
        id: "resp-2",
        request_id: "req-1",
        output: { text: "Complete" },
      } as any;

      const localMessageItems = [
        {
          fullMessageID: "req-1",
          ui_state: { id: "ui-1", streamingState: undefined },
        },
        {
          fullMessageID: "resp-1",
          ui_state: { id: "ui-2", streamingState: { isDone: false } },
        },
        {
          fullMessageID: "resp-2",
          ui_state: { id: "ui-3", streamingState: undefined },
        },
      ] as any;

      const allMessagesByID = {
        "req-1": mockRequest,
        "resp-1": mockStreamingResponse,
        "resp-2": mockNonStreamingResponse,
      };

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(true);
    });

    it("should return false when message is not found in allMessagesByID", () => {
      const localMessageItems = [
        {
          fullMessageID: "missing-id",
          ui_state: { id: "ui-1", streamingState: undefined },
        },
      ] as any;

      const allMessagesByID = {};

      const result = hasNewNonStreamingResponse(
        localMessageItems,
        allMessagesByID,
      );
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // applySafariScrollAnchoringRestore
  // ─────────────────────────────────────────────────────────────────────────────

  describe("applySafariScrollAnchoringRestore", () => {
    it("should return restore target when snapshot differs from current scrollTop", () => {
      const currentScrollTop = 100;
      const snapshot = 150;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBe(150);
    });

    it("should return null when snapshot is null", () => {
      const currentScrollTop = 100;
      const snapshot: number | null = null;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBeNull();
    });

    it("should return null when snapshot equals current scrollTop", () => {
      const currentScrollTop = 100;
      const snapshot = 100;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBeNull();
    });

    it("should handle scroll position decrease from Safari anchoring", () => {
      const currentScrollTop = 50;
      const snapshot = 100;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBe(100);
    });

    it("should return null when scroll position increases", () => {
      const currentScrollTop = 150;
      const snapshot = 100;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBeNull();
    });

    it("should handle zero scroll positions correctly", () => {
      const currentScrollTop = 0;
      const snapshot = 0;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBeNull();
    });

    it("should handle large scroll values correctly", () => {
      const currentScrollTop = 5000;
      const snapshot = 5100;

      const result = applySafariScrollAnchoringRestore(
        currentScrollTop,
        snapshot,
      );
      expect(result).toBe(5100);
    });
  });
});
