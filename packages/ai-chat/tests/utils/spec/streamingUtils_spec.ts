/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  applyChunk,
  chunkHasDisplayableContent,
  deriveStreamingItemText,
  messageHasDisplayableContent,
  resetStopStreamingButton,
  resolveChunkContext,
  shouldShowStopStreaming,
  StreamingTracker,
} from '../../../src/chat/utils/streamingUtils';

describe('streamingUtils', () => {
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

  describe('deriveStreamingItemText', () => {
    // The chunk flow accumulates text in `chunks` — the item's own text holds only the
    // first chunk, so the join must win while chunks exist.
    it('joins chunks for a chunk-delivered item mid-stream', () => {
      expect(
        deriveStreamingItemText('Hello ', {
          isDone: false,
          chunks: [{ text: 'Hello ' }, { text: 'world' }],
        })
      ).toBe('Hello world');
    });

    // The upsert flow streams whole-message snapshots: `chunks` is always empty and the
    // item's text is complete on every update. Joining the empty array rendered
    // upsert-streamed text as blank until COMPLETE — the regression this pins.
    it('falls back to the item text for a snapshot-delivered item mid-stream', () => {
      expect(
        deriveStreamingItemText('Hello world so far', {
          isDone: false,
          chunks: [],
        })
      ).toBe('Hello world so far');
    });

    it('uses the item text once streaming is done', () => {
      expect(
        deriveStreamingItemText('The final text', {
          isDone: true,
          chunks: [{ text: 'stale ' }, { text: 'chunks' }],
        })
      ).toBe('The final text');
    });

    it('uses the item text when there is no streaming state', () => {
      expect(deriveStreamingItemText('Plain text', undefined)).toBe(
        'Plain text'
      );
    });

    it('treats chunks with missing text as empty rather than "undefined"', () => {
      expect(
        deriveStreamingItemText('', {
          isDone: false,
          chunks: [{ text: 'a' }, {}, { text: 'b' }],
        })
      ).toBe('ab');
    });
  });

  describe('resolveChunkContext', () => {
    it('extracts metadata for partial chunks', () => {
      const partialChunk = {
        partial_item: {
          text: 'chunk',
          streaming_metadata: {
            id: 'item-1',
            response_id: 'resp-1',
          },
        },
      } as any;

      const context = resolveChunkContext(partialChunk, 'resp-1');

      expect(context.messageID).toBe('resp-1');
      expect(context.isPartialItem).toBe(true);
      expect(context.item).toEqual(partialChunk.partial_item);
    });

    it('extracts metadata for final response chunks', () => {
      const finalChunk = {
        final_response: { id: 'resp-final' },
      } as any;

      const context = resolveChunkContext(finalChunk);

      expect(context.isFinalResponse).toBe(true);
      expect(context.messageID).toBe('resp-final');
    });
  });

  describe('stop streaming helpers', () => {
    describe('shouldShowStopStreaming', () => {
      it('returns true when cancellable and button not visible', () => {
        expect(shouldShowStopStreaming({ cancellable: true }, false)).toBe(
          true
        );
      });

      it('returns false when button already visible (avoid redundant dispatch)', () => {
        expect(shouldShowStopStreaming({ cancellable: true }, true)).toBe(
          false
        );
      });

      it('returns false when streaming data is undefined', () => {
        expect(shouldShowStopStreaming(undefined, false)).toBe(false);
      });

      it('returns false when cancellable is false', () => {
        expect(shouldShowStopStreaming({ cancellable: false }, false)).toBe(
          false
        );
      });

      it('returns false when cancellable is undefined', () => {
        expect(shouldShowStopStreaming({}, false)).toBe(false);
      });

      it('handles edge case with button visible and non-cancellable', () => {
        expect(shouldShowStopStreaming({ cancellable: false }, true)).toBe(
          false
        );
      });
    });

    describe('resetStopStreamingButton', () => {
      it('resets stop streaming button when visible', () => {
        const store = createStore(true);
        resetStopStreamingButton(store as any);
        expect(store.dispatch).toHaveBeenCalledTimes(2);
      });

      it('does nothing when button not visible', () => {
        const store = createStore(false);
        resetStopStreamingButton(store as any);
        expect(store.dispatch).not.toHaveBeenCalled();
      });

      // This helper hides unconditionally. Deciding *whether* to hide while other
      // messages are still streaming belongs to MessageService — see its
      // hideStopStreamingButtonIfIdle / hideStopStreamingButtonIfNoUpsertStreaming,
      // covered in MessageService_spec and the upsertMessage instance specs.
    });
  });

  describe('applyChunk', () => {
    const chunkWithOptions = (messageOptions?: Record<string, unknown>) =>
      ({
        streaming_metadata: { response_id: 'msg-1' },
        ...(messageOptions
          ? { partial_response: { message_options: messageOptions } }
          : {}),
        partial_item: { response_type: 'text', text: 'Hi' },
      }) as any;

    it('starts a new stream from an empty placeholder', () => {
      const message = applyChunk(undefined, chunkWithOptions(), 'msg-1');

      expect(message).toEqual({
        id: 'msg-1',
        output: { generic: [] },
        history: { timestamp: expect.any(Number) },
      });
    });

    it('returns the stored message as is when the chunk has no message_options', () => {
      const prev = {
        id: 'msg-1',
        output: { generic: [] },
        history: { timestamp: 1 },
      } as any;

      expect(applyChunk(prev, chunkWithOptions(), 'msg-1')).toBe(prev);
    });

    it('deep-merges message_options into a copy, the way lodash merge does', () => {
      const prev = Object.freeze({
        id: 'msg-1',
        output: Object.freeze({ generic: [] }),
        history: Object.freeze({ timestamp: 1 }),
        message_options: Object.freeze({
          reasoning: Object.freeze({
            content: 'Thinking',
            steps: Object.freeze([
              Object.freeze({ title: 'S1' }),
              Object.freeze({ title: 'S2' }),
            ]),
          }),
          response_user_profile: Object.freeze({ id: 'p', nickname: 'Pat' }),
        }),
      }) as any;

      const message = applyChunk(
        prev,
        chunkWithOptions({
          reasoning: { steps: [{ content: 'c1' }] },
          response_user_profile: { nickname: undefined },
        }),
        'msg-1'
      );

      expect(message).not.toBe(prev);
      expect(message.message_options).toEqual({
        reasoning: {
          content: 'Thinking',
          steps: [{ title: 'S1', content: 'c1' }, { title: 'S2' }],
        },
        response_user_profile: { id: 'p', nickname: 'Pat' },
      });
      expect(prev.message_options.reasoning.steps[0]).toEqual({ title: 'S1' });
    });
  });

  describe('StreamingTracker', () => {
    it('tracks, resolves, and clears response/item IDs', () => {
      const tracker = new StreamingTracker();
      tracker.track('resp-1', 'req-1', new AbortController(), 'item-1');
      expect(tracker.resolveResponseId('item-1')).toBe('resp-1');
      expect(tracker.getMeta('resp-1')?.requestId).toBe('req-1');

      tracker.clear('resp-1');
      expect(tracker.getMeta('resp-1')).toBeUndefined();
      expect(tracker.resolveResponseId('item-1')).toBe('item-1');
    });

    describe('content detection', () => {
      describe('chunkHasDisplayableContent', () => {
        it('returns false for non-partial chunks', () => {
          const chunk = { final_response: { id: '1' } } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it('returns false for chunk without partial_item', () => {
          const chunk = { complete_item: { response_type: 'text' } } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it('returns false for TEXT with empty string', () => {
          const chunk = {
            partial_item: { response_type: 'text', text: '' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it('returns false for TEXT with whitespace only', () => {
          const chunk = {
            partial_item: { response_type: 'text', text: '   \n  \t  ' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it('returns true for TEXT with actual content', () => {
          const chunk = {
            partial_item: { response_type: 'text', text: 'Hello' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it('returns true for TEXT with content after whitespace', () => {
          const chunk = {
            partial_item: { response_type: 'text', text: '  Hello  ' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it('returns false for USER_DEFINED without user_defined object', () => {
          const chunk = {
            partial_item: { response_type: 'user_defined' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });

        it('returns true for USER_DEFINED with user_defined object', () => {
          const chunk = {
            partial_item: {
              response_type: 'user_defined',
              user_defined: { type: 'custom' },
            },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it('returns true for IMAGE response type', () => {
          const chunk = {
            partial_item: { response_type: 'image' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it('returns true for VIDEO response type', () => {
          const chunk = {
            partial_item: { response_type: 'video' },
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(true);
        });

        it('returns false for partial_item without response_type', () => {
          const chunk = {
            partial_item: {},
          } as any;
          expect(chunkHasDisplayableContent(chunk)).toBe(false);
        });
      });

      describe('messageHasDisplayableContent', () => {
        it('returns false for undefined message', () => {
          expect(messageHasDisplayableContent(undefined)).toBe(false);
        });

        it('returns false for message without item', () => {
          const msg = { ui_state: {} } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it('returns false for message without response_type', () => {
          const msg = { item: {}, ui_state: {} } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it('returns true for TEXT with content in item.text', () => {
          const msg = {
            item: { response_type: 'text', text: 'Hello World' },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns false for TEXT with empty item.text and no streaming', () => {
          const msg = {
            item: { response_type: 'text', text: '' },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it('returns true for TEXT with content in streaming chunks', () => {
          const msg = {
            item: { response_type: 'text', text: '' },
            ui_state: {
              streamingState: {
                chunks: [{ text: 'Hello' }, { text: ' ' }, { text: 'World' }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns false for TEXT with empty streaming chunks', () => {
          const msg = {
            item: { response_type: 'text', text: '' },
            ui_state: {
              streamingState: {
                chunks: [{ text: '' }, { text: '  ' }, { text: '\n' }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it('prefers item.text over streaming chunks when item.text has content', () => {
          const msg = {
            item: { response_type: 'text', text: 'Final text' },
            ui_state: {
              streamingState: {
                chunks: [{ text: 'Streaming' }],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('handles streaming chunks with undefined text', () => {
          const msg = {
            item: { response_type: 'text', text: '' },
            ui_state: {
              streamingState: {
                chunks: [{ text: undefined }, { text: 'Hello' }, {}],
              },
            },
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns false for USER_DEFINED without user_defined object', () => {
          const msg = {
            item: { response_type: 'user_defined' },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(false);
        });

        it('returns true for USER_DEFINED with user_defined object', () => {
          const msg = {
            item: {
              response_type: 'user_defined',
              user_defined: { component: 'MyComponent' },
            },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns true for IMAGE response type', () => {
          const msg = {
            item: { response_type: 'image', source: 'url' },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns true for VIDEO response type', () => {
          const msg = {
            item: { response_type: 'video', source: 'url' },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });

        it('returns true for OPTION response type', () => {
          const msg = {
            item: { response_type: 'option', options: [] },
            ui_state: {},
          } as any;
          expect(messageHasDisplayableContent(msg)).toBe(true);
        });
      });
    });
  });
});
