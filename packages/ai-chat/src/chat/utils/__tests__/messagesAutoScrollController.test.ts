/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  cleanupMessageResizeObserver,
  createMessageResizeObserver,
  updateObservedMessages,
} from "../messagesAutoScrollController";

// Mock lodash throttle to execute immediately for testing
jest.mock("lodash/throttle", () => {
  return jest.fn((fn) => {
    const throttled = (...args: any[]) => fn(...args);
    throttled.cancel = jest.fn();
    return throttled;
  });
});

describe("messagesAutoScrollController - ResizeObserver utilities", () => {
  let mockResizeObserver: jest.Mock;
  let resizeObserverCallback: ResizeObserverCallback;

  beforeEach(() => {
    // Mock ResizeObserver
    mockResizeObserver = jest.fn((callback) => {
      resizeObserverCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });
    global.ResizeObserver = mockResizeObserver as any;

    // Mock setTimeout and clearTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("createMessageResizeObserver", () => {
    it("should create a ResizeObserver with correct configuration", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      expect(state).toBeDefined();
      expect(state.observer).toBeDefined();
      expect(state.messageSizes).toBeInstanceOf(Map);
      expect(state.settleTimers).toBeInstanceOf(Map);
      expect(mockResizeObserver).toHaveBeenCalledTimes(1);
    });

    it("should use default values for optional config parameters", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      expect(state).toBeDefined();
      // Defaults are used internally, just verify state is created
      expect(state.messageSizes.size).toBe(0);
      expect(state.settleTimers.size).toBe(0);
    });

    it("should not trigger callback when no pinned message exists", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => false);

      createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      // Create mock entries
      const mockElement = document.createElement("div");
      const mockEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      // Trigger resize
      resizeObserverCallback(mockEntries, mockResizeObserver() as any);

      expect(onSignificantResize).not.toHaveBeenCalled();
    });

    it("should track message sizes on resize", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      const mockElement = document.createElement("div");
      const mockEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(mockEntries, mockResizeObserver() as any);

      expect(state.messageSizes.get(mockElement)).toBe(200);
    });

    it("should trigger callback on significant size change", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        significantChangeThreshold: 10,
      });

      const mockElement = document.createElement("div");

      // First resize - establish baseline
      const firstEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 100,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(firstEntries, mockResizeObserver() as any);
      expect(onSignificantResize).not.toHaveBeenCalled(); // First measurement doesn't trigger

      // Second resize - significant change (>10px)
      const secondEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 120, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 120, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 120,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 120, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(secondEntries, mockResizeObserver() as any);
      expect(onSignificantResize).toHaveBeenCalledTimes(1);
    });

    it("should not trigger callback on insignificant size change", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        significantChangeThreshold: 10,
      });

      const mockElement = document.createElement("div");

      // First resize
      const firstEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 100,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(firstEntries, mockResizeObserver() as any);

      // Second resize - insignificant change (<=10px)
      const secondEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 105, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 105, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 105,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 105, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(secondEntries, mockResizeObserver() as any);
      expect(onSignificantResize).not.toHaveBeenCalled();
    });

    it("should set settle timer after resize", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        settleTimeout: 5000,
      });

      const mockElement = document.createElement("div");
      const mockEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(mockEntries, mockResizeObserver() as any);

      expect(state.settleTimers.has(mockElement)).toBe(true);
    });

    it("should clear existing settle timer on new resize", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        settleTimeout: 5000,
      });

      const mockElement = document.createElement("div");
      const mockEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      // First resize
      resizeObserverCallback(mockEntries, mockResizeObserver() as any);
      const firstTimer = state.settleTimers.get(mockElement);

      // Second resize
      resizeObserverCallback(mockEntries, mockResizeObserver() as any);
      const secondTimer = state.settleTimers.get(mockElement);

      expect(firstTimer).not.toBe(secondTimer);
    });

    it("should unobserve element after settle timeout", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        settleTimeout: 5000,
      });

      const mockElement = document.createElement("div");
      const mockEntries: ResizeObserverEntry[] = [
        {
          target: mockElement,
          borderBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 200, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(mockEntries, mockResizeObserver() as any);

      // Fast-forward past settle timeout
      jest.advanceTimersByTime(5000);

      expect(state.observer.unobserve).toHaveBeenCalledWith(mockElement);
      expect(state.settleTimers.has(mockElement)).toBe(false);
      expect(state.messageSizes.has(mockElement)).toBe(false);
    });
  });

  describe("updateObservedMessages", () => {
    it("should observe new message elements", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      const element1 = document.createElement("div");
      const element2 = document.createElement("div");

      updateObservedMessages(state, [element1, element2]);

      expect(state.observer.observe).toHaveBeenCalledWith(element1);
      expect(state.observer.observe).toHaveBeenCalledWith(element2);
      expect(state.observer.observe).toHaveBeenCalledTimes(2);
    });

    it("should not re-observe already observed elements", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      const element = document.createElement("div");

      // Simulate element already being tracked
      state.messageSizes.set(element, 100);

      updateObservedMessages(state, [element]);

      expect(state.observer.observe).not.toHaveBeenCalled();
    });

    it("should handle empty element array", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      updateObservedMessages(state, []);

      expect(state.observer.observe).not.toHaveBeenCalled();
    });

    it("should skip null or undefined elements", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      const element = document.createElement("div");

      updateObservedMessages(state, [element, null as any, undefined as any]);

      expect(state.observer.observe).toHaveBeenCalledTimes(1);
      expect(state.observer.observe).toHaveBeenCalledWith(element);
    });
  });

  describe("cleanupMessageResizeObserver", () => {
    it("should disconnect observer", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      cleanupMessageResizeObserver(state);

      expect(state.observer.disconnect).toHaveBeenCalledTimes(1);
    });

    it("should clear all settle timers", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      // Add some mock timers
      const element1 = document.createElement("div");
      const element2 = document.createElement("div");
      const timer1 = setTimeout(() => {}, 1000);
      const timer2 = setTimeout(() => {}, 1000);
      state.settleTimers.set(element1, timer1);
      state.settleTimers.set(element2, timer2);

      cleanupMessageResizeObserver(state);

      expect(state.settleTimers.size).toBe(0);
    });

    it("should clear message sizes map", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      // Add some mock sizes
      const element1 = document.createElement("div");
      const element2 = document.createElement("div");
      state.messageSizes.set(element1, 100);
      state.messageSizes.set(element2, 200);

      cleanupMessageResizeObserver(state);

      expect(state.messageSizes.size).toBe(0);
    });

    it("should handle cleanup of empty state", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
      });

      // Should not throw
      expect(() => cleanupMessageResizeObserver(state)).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple messages with different resize patterns", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        significantChangeThreshold: 10,
      });

      const element1 = document.createElement("div");
      const element2 = document.createElement("div");

      // First resize for both elements
      const firstEntries: ResizeObserverEntry[] = [
        {
          target: element1,
          borderBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 100,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
        } as ResizeObserverEntry,
        {
          target: element2,
          borderBoxSize: [{ blockSize: 150, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 150, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 150,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 150, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(firstEntries, mockResizeObserver() as any);

      // Second resize - only element1 changes significantly
      const secondEntries: ResizeObserverEntry[] = [
        {
          target: element1,
          borderBoxSize: [{ blockSize: 120, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 120, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 120,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 120, inlineSize: 100 }],
        } as ResizeObserverEntry,
        {
          target: element2,
          borderBoxSize: [{ blockSize: 152, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 152, inlineSize: 100 }],
          contentRect: {
            top: 0,
            left: 0,
            width: 100,
            height: 152,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [{ blockSize: 152, inlineSize: 100 }],
        } as ResizeObserverEntry,
      ];

      resizeObserverCallback(secondEntries, mockResizeObserver() as any);

      expect(onSignificantResize).toHaveBeenCalledTimes(1);
      expect(state.messageSizes.get(element1)).toBe(120);
      expect(state.messageSizes.get(element2)).toBe(152);
    });

    it("should handle rapid successive resizes", () => {
      const onSignificantResize = jest.fn();
      const hasPinnedMessage = jest.fn(() => true);

      const state = createMessageResizeObserver({
        onSignificantResize,
        hasPinnedMessage,
        throttleTimeout: 100,
        significantChangeThreshold: 10,
        settleTimeout: 5000,
      });

      const element = document.createElement("div");

      // Rapid resizes
      for (let i = 0; i < 5; i++) {
        const entries: ResizeObserverEntry[] = [
          {
            target: element,
            borderBoxSize: [{ blockSize: 100 + i * 20, inlineSize: 100 }],
            contentBoxSize: [{ blockSize: 100 + i * 20, inlineSize: 100 }],
            contentRect: {
              top: 0,
              left: 0,
              width: 100,
              height: 100 + i * 20,
            } as DOMRectReadOnly,
            devicePixelContentBoxSize: [
              { blockSize: 100 + i * 20, inlineSize: 100 },
            ],
          } as ResizeObserverEntry,
        ];

        resizeObserverCallback(entries, mockResizeObserver() as any);
      }

      // Should have one timer that keeps getting reset
      expect(state.settleTimers.size).toBe(1);
      expect(state.settleTimers.has(element)).toBe(true);
    });
  });
});

// Made with Bob
