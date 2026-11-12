/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, aTimeout } from '@open-wc/testing';
import {
  MessagesScrollController,
  type ScrollHost,
  type PortableMessage,
} from '../src/messages-scroll-controller.js';

/**
 * Creates a controllable container mock attached to document.body so isConnected is true.
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

  el.getBoundingClientRect = () =>
    ({
      top: rectTop,
      height: clientHeight,
      bottom: rectTop + clientHeight,
    }) as DOMRect;

  document.body.appendChild(el);
  return el;
}

/**
 * Creates a minimal spacer element mock whose rect reflects container scroll.
 */
function createMockSpacer(container: HTMLElement, rectTop = 400): HTMLElement {
  return {
    getBoundingClientRect: () =>
      ({
        top: rectTop - container.scrollTop,
        bottom: rectTop - container.scrollTop + 10,
        height: 10,
      }) as DOMRect,
  } as unknown as HTMLElement;
}

/**
 * Creates a fake PortableMessage object.
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
 * Creates a pinnable message backed by a real detached HTMLElement whose rect
 * top is relative to container scroll.
 */
function createRealPinnableMessage(
  container: HTMLElement,
  id: string,
  rectTop: number,
  rectHeight: number
): PortableMessage {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => {
    const top = rectTop - container.scrollTop;
    return {
      top,
      height: rectHeight,
      bottom: top + rectHeight,
    } as DOMRect;
  };
  return createPortableMessage({ id, element, isPinnable: true });
}

/** Flush a single animation frame. */
function flushRaf(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/** Flush several animation frames for async pin/scroll chains to settle. */
async function flushFrames(count = 8): Promise<void> {
  for (let i = 0; i < count; i++) {
    await flushRaf();
  }
}

/**
 * A controllable ScrollHost test harness with recorded calls and a swappable message list.
 */
function createHarness(geom?: Parameters<typeof createFakeContainer>[0]) {
  const container = createFakeContainer(geom);
  const spacer = createMockSpacer(container, 400);
  const spacerHeights: number[] = [];
  const floorHeights: number[] = [];
  let messages: PortableMessage[] = [];
  let retainedMessageIds: string[] = [];

  const host: ScrollHost = {
    getScrollContainer: () => container,
    getSpacer: () => spacer,
    setSpacerHeight: (px: number) => {
      spacerHeights.push(px);
    },
    setScrollHeightFloor: (px: number) => {
      floorHeights.push(px);
    },
    getMessages: () => messages,
    hasMessage: (id: string) =>
      retainedMessageIds.includes(id) ||
      messages.some((item) => item.messageId === id),
    onScrollGeometryChanged: () => {},
  };

  return {
    container,
    spacer,
    spacerHeights,
    floorHeights,
    host,
    setMessages: (next: PortableMessage[]) => {
      messages = next;
    },
    retainMessages: (ids: string[]) => {
      retainedMessageIds = ids;
    },
    cleanup: () => {
      container.remove();
    },
  };
}

describe('MessagesScrollController', () => {
  let harnesses: ReturnType<typeof createHarness>[] = [];

  function makeHarness(geom?: Parameters<typeof createFakeContainer>[0]) {
    const h = createHarness(geom);
    harnesses.push(h);
    return h;
  }

  afterEach(() => {
    for (const h of harnesses) {
      h.cleanup();
    }
    harnesses = [];
  });

  describe('geometry and scroll queries', () => {
    it('isScrolledAwayFromBottom() reflects distance from bottom', () => {
      // scrollHeight 2000, clientHeight 500, scrollTop 0: remaining = 1500 > 60 -> true
      const away = makeHarness({
        scrollHeight: 2000,
        clientHeight: 500,
        scrollTop: 0,
      });
      const controllerAway = new MessagesScrollController(away.host);
      expect(controllerAway.isScrolledAwayFromBottom()).to.be.true;

      // At bottom: scrollTop 1500 -> remaining = 0 <= 60 -> false
      const atBottom = makeHarness({
        scrollHeight: 2000,
        clientHeight: 500,
        scrollTop: 1500,
      });
      const controllerBottom = new MessagesScrollController(atBottom.host);
      expect(controllerBottom.isScrolledAwayFromBottom()).to.be.false;
    });

    it('isScrolledAwayFromBottom() returns false when there is no scroll container', () => {
      const host: ScrollHost = {
        getScrollContainer: () => null,
        getSpacer: () => null,
        setSpacerHeight: () => {},
        setScrollHeightFloor: () => {},
        getMessages: () => [],
        hasMessage: () => false,
        onScrollGeometryChanged: () => {},
      };
      const controller = new MessagesScrollController(host);
      expect(controller.isScrolledAwayFromBottom()).to.be.false;
    });

    it('getContainerScrollBottom() computes scrollHeight - offsetHeight - scrollTop', () => {
      const h = makeHarness({
        scrollHeight: 2000,
        offsetHeight: 500,
        scrollTop: 300,
      });
      const controller = new MessagesScrollController(h.host);
      // 2000 - 500 - 300 = 1200
      expect(controller.getContainerScrollBottom()).to.equal(1200);
    });
  });

  describe('scrolling actions', () => {
    it("doScrollToMessageElement(element, animate) sets scrollTop toward element's offsetTop", () => {
      const h = makeHarness({ scrollTop: 0 });
      const controller = new MessagesScrollController(h.host);

      const messageElement = document.createElement('div');
      Object.defineProperty(messageElement, 'offsetTop', {
        configurable: true,
        get: () => 777,
      });

      controller.doScrollToMessageElement(messageElement, false);
      expect(h.container.scrollTop).to.equal(777);
    });

    it('doScrollToMessageElement(null) is a safe no-op', () => {
      const h = makeHarness({ scrollTop: 42 });
      const controller = new MessagesScrollController(h.host);
      expect(() => controller.doScrollToMessageElement(null)).to.not.throw();
      expect(h.container.scrollTop).to.equal(42);
    });

    it('doAutoScroll({ scrollToTop }) scrolls to the specified top offset', async () => {
      const h = makeHarness({ scrollTop: 500 });
      h.setMessages([createPortableMessage({ id: 'msg1' })]);
      const controller = new MessagesScrollController(h.host);
      controller.connect();
      await aTimeout(250);

      controller.doAutoScroll({ scrollToTop: 100 });
      await flushFrames();

      expect(h.container.scrollTop).to.equal(100);
      controller.disconnect();
    });

    it('doAutoScroll({ scrollToBottom }) scrolls to bottom minus offset', async () => {
      const h = makeHarness({
        scrollHeight: 2000,
        clientHeight: 500,
        offsetHeight: 500,
        scrollTop: 0,
      });
      h.setMessages([createPortableMessage({ id: 'msg1' })]);
      const controller = new MessagesScrollController(h.host);
      controller.connect();
      await aTimeout(250);

      // maxScrollTop = 2000 - 500 = 1500; with scrollToBottom = 50 -> target = 1450
      controller.doAutoScroll({ scrollToBottom: 50 });
      await flushFrames();

      expect(h.container.scrollTop).to.equal(1450);
      controller.disconnect();
    });

    it('scrollElementIntoView scrolls container when element is below visible area', async () => {
      const h = makeHarness({
        scrollTop: 0,
        clientHeight: 500,
        offsetHeight: 500,
        scrollHeight: 2000,
      });
      const controller = new MessagesScrollController(h.host);

      const target = document.createElement('div');
      target.getBoundingClientRect = () =>
        ({ top: 600, bottom: 700, height: 100 }) as DOMRect;
      Object.defineProperty(target, 'offsetHeight', {
        configurable: true,
        get: () => 100,
      });

      controller.scrollElementIntoView(target);
      await flushFrames();

      expect(h.container.scrollTop).to.be.greaterThan(0);
    });
  });

  describe('auto-scroll and pinning lifecycle', () => {
    it('onHostUpdated pin flow: pins the last pinnable message, writing spacer and moving scrollTop', async () => {
      const h = makeHarness({
        scrollTop: 0,
        clientHeight: 500,
        scrollHeight: 1000,
        offsetHeight: 500,
        rectTop: 0,
      });

      const pinnable = createRealPinnableMessage(h.container, 'req-1', 200, 80);
      const placeholder = createPortableMessage({ id: 'ui-0' });

      const controller = new MessagesScrollController(h.host);
      h.setMessages([]);
      controller.connect();

      // Host updates with placeholder and pinnable request message
      h.setMessages([placeholder, pinnable]);
      controller.onHostUpdated(null);

      await flushFrames();

      // Spacer was calculated and applied (includes deficit 240), and container scrolled to pin target
      expect(h.spacerHeights).to.include(240);
      expect(h.container.scrollTop).to.equal(140);

      controller.disconnect();
    });

    it('restart: replacing all messages resets pin, zeroes spacer, and scrolls to top', async () => {
      const h = makeHarness({
        scrollTop: 0,
        clientHeight: 500,
        scrollHeight: 1000,
        offsetHeight: 500,
        rectTop: 0,
      });

      const pinnable = createRealPinnableMessage(h.container, 'req-1', 200, 80);
      const placeholder = createPortableMessage({ id: 'ui-0' });

      const controller = new MessagesScrollController(h.host);
      h.setMessages([]);
      controller.connect();

      h.setMessages([placeholder, pinnable]);
      controller.onHostUpdated(null);
      await flushFrames();
      expect(h.container.scrollTop).to.equal(140);

      // Reset conversation with only a welcome message
      h.spacerHeights.length = 0;
      h.setMessages([createPortableMessage({ id: 'welcome' })]);
      controller.onHostUpdated(null);
      await flushFrames();

      expect(h.container.scrollTop).to.equal(0);
      expect(h.spacerHeights[h.spacerHeights.length - 1]).to.equal(0);

      controller.disconnect();
    });

    it('disconnect stops active operations and allows clean reconnect', () => {
      const h = makeHarness({ scrollTop: 0 });
      const controller = new MessagesScrollController(h.host);

      controller.connect();
      expect(() => controller.disconnect()).to.not.throw();

      // Calls after disconnect are safe no-ops
      expect(() => controller.onHostUpdated(null)).to.not.throw();
      expect(() => controller.connect()).to.not.throw();
      controller.disconnect();
    });
  });
});
