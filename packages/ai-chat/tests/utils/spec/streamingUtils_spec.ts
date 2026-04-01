/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  chunkHasDisplayableContent,
  mergePartialResponseOptions,
  messageHasDisplayableContent,
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

      describe("with streamingMessageID parameter", () => {
        it("keeps button visible when streaming is active (edge case fix)", () => {
          const store = createStore(true);

          // Simulate: customSendMessage resolved but streaming still active
          resetStopStreamingButton(store as any, "active-stream-123");

          // Button should STAY visible
          expect(store.dispatch).not.toHaveBeenCalled();
        });

        it("hides button when no streaming active (streamingMessageID is null)", () => {
          const store = createStore(true);

          // Simulate: no active streaming
          resetStopStreamingButton(store as any, null);

          // Button should be hidden
          expect(store.dispatch).toHaveBeenCalledTimes(2);
        });

        it("hides button when streamingMessageID is undefined", () => {
          const store = createStore(true);

          resetStopStreamingButton(store as any, undefined);

          // Button should be hidden
          expect(store.dispatch).toHaveBeenCalledTimes(2);
        });

        it("maintains backward compatibility (no parameter)", () => {
          const store = createStore(true);

          // Old behavior: always hide when called
          resetStopStreamingButton(store as any);

          expect(store.dispatch).toHaveBeenCalledTimes(2);
        });

        it("does nothing when button not visible, regardless of streamingMessageID", () => {
          const store = createStore(false);

          resetStopStreamingButton(store as any, "active-stream");

          expect(store.dispatch).not.toHaveBeenCalled();
        });
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

    describe("content detection", () => {
      describe("chunkHasDisplayableContent", () => {
        it("returns false for non-partial chunks", () => {
          const chunk = { final_response: { id: "1" } } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it("returns false for chunk without partial_item", () => {
          const chunk = { complete_item: { response_type: "text" } } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it("returns false for TEXT with empty string", () => {
          const chunk = {
            partial_item: { response_type: "text", text: "" },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it("returns false for TEXT with whitespace only", () => {
          const chunk = {
            partial_item: { response_type: "text", text: "   \n  \t  " },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it("returns true for TEXT with actual content", () => {
          const chunk = {
            partial_item: { response_type: "text", text: "Hello" },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it("returns true for TEXT with content after whitespace", () => {
          const chunk = {
            partial_item: { response_type: "text", text: "  Hello  " },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it("returns false for USER_DEFINED without user_defined object", () => {
          const chunk = {
            partial_item: { response_type: "user_defined" },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it("returns true for USER_DEFINED with user_defined object", () => {
          const chunk = {
            partial_item: {
              response_type: "user_defined",
              user_defined: { type: "custom" },
            },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it("returns true for IMAGE response type", () => {
          const chunk = {
            partial_item: { response_type: "image" },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it("returns true for VIDEO response type", () => {
          const chunk = {
            partial_item: { response_type: "video" },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it("returns false for partial_item without response_type", () => {
          const chunk = {
            partial_item: {},
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });
      });

      describe("messageHasDisplayableContent", () => {
        it("returns false for undefined message", () => {
          expect(messageHasDisplayableContent(undefined)).toBe(false);
        });

        it("returns false for message without item", () => {
          const msg = { ui_state: {} } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it("returns false for message without response_type", () => {
          const msg = { item: {}, ui_state: {} } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it("returns true for TEXT with content in item.text", () => {
          const msg = {
            item: { response_type: "text", text: "Hello World" },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns false for TEXT with empty item.text and no streaming", () => {
          const msg = {
            item: { response_type: "text", text: "" },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it("returns true for TEXT with content in streaming chunks", () => {
          const msg = {
            item: { response_type: "text", text: "" },
            ui_state: {
              streamingState: {
                chunks: [{ text: "Hello" }, { text: " " }, { text: "World" }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns false for TEXT with empty streaming chunks", () => {
          const msg = {
            item: { response_type: "text", text: "" },
            ui_state: {
              streamingState: {
                chunks: [{ text: "" }, { text: "  " }, { text: "\n" }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it("prefers item.text over streaming chunks when item.text has content", () => {
          const msg = {
            item: { response_type: "text", text: "Final text" },
            ui_state: {
              streamingState: {
                chunks: [{ text: "Streaming" }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("handles streaming chunks with undefined text", () => {
          const msg = {
            item: { response_type: "text", text: "" },
            ui_state: {
              streamingState: {
                chunks: [{ text: undefined }, { text: "Hello" }, {}],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns false for USER_DEFINED without user_defined object", () => {
          const msg = {
            item: { response_type: "user_defined" },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it("returns true for USER_DEFINED with user_defined object", () => {
          const msg = {
            item: {
              response_type: "user_defined",
              user_defined: { component: "MyComponent" },
            },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns true for IMAGE response type", () => {
          const msg = {
            item: { response_type: "image", source: "url" },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns true for VIDEO response type", () => {
          const msg = {
            item: { response_type: "video", source: "url" },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it("returns true for OPTION response type", () => {
          const msg = {
            item: { response_type: "option", options: [] },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });
      });
    });
  });
});
