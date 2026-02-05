/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  mergePartialResponseOptions,
  resetStopStreamingButton,
  resolveChunkContext,
  shouldShowStopStreaming,
  StreamingTracker,
} from "../../../src/chat/utils/streamingUtils";

describe("streamingUtils", () => {
  const createStore = (isVisible = true) => {
    const dispatch = jest.fn();
    return {
      dispatch,
      getState: () => ({
        assistantInputState: {
          stopStreamingButtonState: { isVisible },
        },
      }),
    };
  };

  describe("resolveChunkContext", () => {
    it("extracts metadata for partial chunks", () => {
      const partialChunk = {
        partial_item: {
          text: "chunk",
          streaming_metadata: {
            id: "item-1",
            response_id: "resp-1",
          },
        },
      } as any;

      const context = resolveChunkContext(partialChunk, "resp-1");

      expect(context.messageID).toBe("resp-1");
      expect(context.isPartialItem).toBe(true);
      expect(context.item).toEqual(partialChunk.partial_item);
    });

    it("extracts metadata for final response chunks", () => {
      const finalChunk = {
        final_response: { id: "resp-final" },
      } as any;

      const context = resolveChunkContext(finalChunk);

      expect(context.isFinalResponse).toBe(true);
      expect(context.messageID).toBe("resp-final");
    });
  });

  describe("stop streaming helpers", () => {
    describe("shouldShowStopStreaming", () => {
      it("returns true when cancellable and button not visible", () => {
        expect(shouldShowStopStreaming({ cancellable: true }, false)).toBe(
          true,
        );
      });

      it("returns false when button already visible (avoid redundant dispatch)", () => {
        expect(shouldShowStopStreaming({ cancellable: true }, true)).toBe(
          false,
        );
      });

      it("returns false when streaming data is undefined", () => {
        expect(shouldShowStopStreaming(undefined, false)).toBe(false);
      });

      it("returns false when cancellable is false", () => {
        expect(shouldShowStopStreaming({ cancellable: false }, false)).toBe(
          false,
        );
      });

      it("returns false when cancellable is undefined", () => {
        expect(shouldShowStopStreaming({}, false)).toBe(false);
      });

      it("handles edge case with button visible and non-cancellable", () => {
        expect(shouldShowStopStreaming({ cancellable: false }, true)).toBe(
          false,
        );
      });
    });

    describe("resetStopStreamingButton", () => {
      it("resets stop streaming button when visible", () => {
        const store = createStore(true);
        resetStopStreamingButton(store as any);
        expect(store.dispatch).toHaveBeenCalledTimes(2);
      });

      it("does nothing when button not visible", () => {
        const store = createStore(false);
        resetStopStreamingButton(store as any);
        expect(store.dispatch).not.toHaveBeenCalled();
      });
    });
  });

  describe("mergePartialResponseOptions", () => {
    it("dispatches merge when message options exist", () => {
      const store = createStore();
      const chunk = {
        partial_response: {
          message_options: { foo: "bar" },
        },
      } as any;
      mergePartialResponseOptions(store as any, "msg-1", chunk);
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });

    it("skips dispatch when no options or message id", () => {
      const store = createStore();
      mergePartialResponseOptions(store as any, undefined, {} as any);
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe("StreamingTracker", () => {
    it("tracks, resolves, and clears response/item IDs", () => {
      const tracker = new StreamingTracker();
      tracker.track("resp-1", "req-1", new AbortController(), "item-1");
      expect(tracker.resolveResponseId("item-1")).toBe("resp-1");
      expect(tracker.getMeta("resp-1")?.requestId).toBe("req-1");

      tracker.clear("resp-1");
      expect(tracker.getMeta("resp-1")).toBeUndefined();
      expect(tracker.resolveResponseId("item-1")).toBe("item-1");
    });
  });
});
