/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageUpsertCoordinator } from '../../../src/chat/services/MessageUpsertCoordinator';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

interface StubState {
  allMessagesByID: Record<string, unknown>;
  allMessageItemsByID: Record<string, unknown>;
  assistantMessageState: { localMessageIDs: string[] };
  assistantInputState: {
    stopStreamingButtonState: { isVisible: boolean; isDisabled: boolean };
  };
}

function makeStubManager(initialMessages: Record<string, unknown> = {}) {
  const state: StubState = {
    allMessagesByID: { ...initialMessages },
    allMessageItemsByID: {},
    assistantMessageState: { localMessageIDs: [] },
    // The coordinator drives the stop streaming button from the upsert lifecycle,
    // so it reads this slice on every call.
    assistantInputState: {
      stopStreamingButtonState: { isVisible: false, isDisabled: false },
    },
  };
  const dispatch = jest.fn((action: { type: string; message?: any }) => {
    if (action.type === 'UPSERT_MESSAGE' && action.message?.id) {
      state.allMessagesByID[action.message.id] = action.message;
    }
  });
  const fire = jest.fn(
    async (_event: { type: string; data?: any }): Promise<void> => undefined
  );
  const chatActions = {
    handleUserDefinedResponseItems: jest.fn(
      async (..._args: any[]): Promise<void> => undefined
    ),
    handleCustomFooterSlot: jest.fn(
      async (..._args: any[]): Promise<void> => undefined
    ),
    announceStreamStarts: jest.fn(),
  };
  const finalizeStreamingMessage = jest.fn();
  // The coordinator asks MessageService to hide the stop streaming button on a terminal
  // upsert; MessageService is the one that decides whether anything else is still live.
  const hideStopStreamingButtonIfIdle = jest.fn();

  const manager = {
    store: {
      getState: () => state,
      dispatch,
    },
    fire,
    actions: chatActions,
    messageService: { finalizeStreamingMessage, hideStopStreamingButtonIfIdle },
  } as unknown as ServiceManager;

  return {
    manager,
    state,
    dispatch,
    fire,
    chatActions,
    finalizeStreamingMessage,
    hideStopStreamingButtonIfIdle,
  };
}

function textResponse(id: string, text: string): MessageResponse {
  return {
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  };
}

describe('MessageUpsertCoordinator', () => {
  describe('input validation', () => {
    it('rejects with TypeError when messageID is empty', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('', MessageState.COMPLETE, () => textResponse('x', ''))
      ).rejects.toThrow(TypeError);
    });

    it('rejects with TypeError when state is not a MessageState value', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('m1', 'not-a-state' as any, () => textResponse('m1', ''))
      ).rejects.toThrow(TypeError);
    });

    it('rejects with TypeError when updater is not a function', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('m1', MessageState.COMPLETE, undefined as any)
      ).rejects.toThrow(TypeError);
    });
  });

  describe('updater return-value contract', () => {
    it('assigns messageID when the returned message has no id', async () => {
      const { manager, dispatch } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.COMPLETE, () => ({
        output: { generic: [] },
      }));
      const call = dispatch.mock.calls.find(
        (args) => args[0].type === 'UPSERT_MESSAGE'
      );
      expect(call?.[0].message.id).toBe('m1');
    });

    it('rejects when the returned message has a different id', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('m1', MessageState.COMPLETE, () =>
          textResponse('WRONG', '')
        )
      ).rejects.toThrow(/but call was for/i);
    });

    it('rejects with TypeError when updater returns null', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('m1', MessageState.COMPLETE, () => null as any)
      ).rejects.toThrow(TypeError);
    });

    it('rejects when upserting an id that already holds a request message', async () => {
      const { manager } = makeStubManager({
        m1: { id: 'm1', input: { text: 'hello' } },
      });
      const coord = new MessageUpsertCoordinator(manager);
      await expect(
        coord.upsert('m1', MessageState.COMPLETE, () => textResponse('m1', ''))
      ).rejects.toThrow(/non-assistant/i);
    });
  });

  describe('pre:receive / receive firing predicate', () => {
    it('fires both events on undefined → COMPLETE', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', '')
      );
      const types = fire.mock.calls.map((c) => c[0].type);
      expect(types).toContain(BusEventType.PRE_RECEIVE);
      expect(types).toContain(BusEventType.RECEIVE);
    });

    it('does not fire on undefined → STREAMING', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', '')
      );
      expect(fire).not.toHaveBeenCalled();
    });

    it('fires once on STREAMING → COMPLETE, not on the intermediate STREAMING calls', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'a')
      );
      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'ab')
      );
      expect(fire).not.toHaveBeenCalled();

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'abc')
      );
      const types = fire.mock.calls.map((c) => c[0].type);
      expect(types.filter((t) => t === BusEventType.PRE_RECEIVE)).toHaveLength(
        1
      );
      expect(types.filter((t) => t === BusEventType.RECEIVE)).toHaveLength(1);
    });

    it('does NOT fire on COMPLETE → COMPLETE (regenerate-on-already-complete)', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'v1')
      );
      fire.mockClear();
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'v2')
      );
      expect(fire).not.toHaveBeenCalled();
    });

    it('does NOT fire on COMPLETE → STREAMING (re-stream after complete)', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'v1')
      );
      fire.mockClear();
      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'v1.x')
      );
      expect(fire).not.toHaveBeenCalled();
    });

    it('does NOT fire on * → ERROR', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', '')
      );
      await coord.upsert('m1', MessageState.ERROR, () =>
        textResponse('m1', '')
      );
      expect(fire).not.toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('serializes calls for the same id', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      const order: string[] = [];

      const a = coord.upsert('m1', MessageState.STREAMING, async () => {
        order.push('a-start');
        await new Promise((r) => setTimeout(r, 10));
        order.push('a-end');
        return textResponse('m1', 'a');
      });
      const b = coord.upsert('m1', MessageState.STREAMING, async () => {
        order.push('b-start');
        await new Promise((r) => setTimeout(r, 10));
        order.push('b-end');
        return textResponse('m1', 'ab');
      });

      await Promise.all([a, b]);
      expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
    });

    it('interleaves calls for different ids', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      const order: string[] = [];

      const a = coord.upsert('m1', MessageState.STREAMING, async () => {
        order.push('a-start');
        await new Promise((r) => setTimeout(r, 20));
        order.push('a-end');
        return textResponse('m1', 'a');
      });
      const b = coord.upsert('m2', MessageState.STREAMING, async () => {
        order.push('b-start');
        await new Promise((r) => setTimeout(r, 5));
        order.push('b-end');
        return textResponse('m2', 'b');
      });

      await Promise.all([a, b]);
      // b should start before a finishes — proves parallel execution.
      const aStart = order.indexOf('a-start');
      const bStart = order.indexOf('b-start');
      const aEnd = order.indexOf('a-end');
      expect(bStart).toBeLessThan(aEnd);
      expect(aStart).toBeLessThan(bStart); // a was queued first
    });

    it('a rejection in one upsert does not poison the chain for the same id', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      const first = coord.upsert('m1', MessageState.STREAMING, () => {
        throw new Error('boom');
      });
      await expect(first).rejects.toThrow('boom');

      // Subsequent upsert must succeed.
      await expect(
        coord.upsert('m1', MessageState.COMPLETE, () => textResponse('m1', ''))
      ).resolves.toBeUndefined();
    });
  });

  describe('clearAll', () => {
    it('drops recorded lifecycle state', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', '')
      );
      expect(coord.getState('m1')).toBe(MessageState.COMPLETE);

      coord.clearAll();
      expect(coord.getState('m1')).toBeUndefined();

      // After clear, a COMPLETE upsert fires again because the predicate sees
      // previousState === undefined.
      fire.mockClear();
      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', '')
      );
      const types = fire.mock.calls.map((c) => c[0].type);
      expect(types).toContain(BusEventType.PRE_RECEIVE);
      expect(types).toContain(BusEventType.RECEIVE);
    });
  });

  describe('markStreaming / markComplete', () => {
    it('markComplete records COMPLETE so subsequent upsert(COMPLETE) suppresses receive', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      // Simulate that addMessage already landed for m1.
      coord.markComplete('m1');

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'updated')
      );
      expect(fire).not.toHaveBeenCalled();
    });

    it('markStreaming records STREAMING; a follow-up upsert(COMPLETE) fires', async () => {
      const { manager, fire } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);
      coord.markStreaming('m1');

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'done')
      );
      const types = fire.mock.calls.map((c) => c[0].type);
      expect(types).toContain(BusEventType.PRE_RECEIVE);
      expect(types).toContain(BusEventType.RECEIVE);
    });

    it('markStreaming does not register streaming liveness', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      // markStreaming is the receive-dedup hook the chunk path calls before the
      // generation check. Treating it as liveness would re-register stale ids after a
      // restart and pin the stop button on forever.
      coord.markStreaming('m1');

      expect(coord.hasStreamingMessages()).toBe(false);
    });
  });

  describe('streaming liveness', () => {
    it('registers on STREAMING and drops on COMPLETE', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'partial')
      );
      expect(coord.hasStreamingMessages()).toBe(true);

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'done')
      );
      expect(coord.hasStreamingMessages()).toBe(false);
    });

    it('drops on ERROR', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'partial')
      );
      await coord.upsert('m1', MessageState.ERROR, () =>
        textResponse('m1', 'failed')
      );

      // ERROR never reaches firePostReceiveAndFinalize, so the drop has to happen in
      // runOne rather than in the finalize phase.
      expect(coord.hasStreamingMessages()).toBe(false);
    });

    it('tracks ids independently', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'a')
      );
      await coord.upsert('m2', MessageState.STREAMING, () =>
        textResponse('m2', 'b')
      );

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'a done')
      );
      expect(coord.hasStreamingMessages()).toBe(true);

      await coord.upsert('m2', MessageState.COMPLETE, () =>
        textResponse('m2', 'b done')
      );
      expect(coord.hasStreamingMessages()).toBe(false);
    });

    it('endAllStreaming settles every registered id and drains', async () => {
      const { manager, dispatch } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'a')
      );
      await coord.upsert('m2', MessageState.STREAMING, () =>
        textResponse('m2', 'b')
      );

      dispatch.mockClear();
      coord.endAllStreaming();

      const ended = dispatch.mock.calls
        .map((call) => call[0] as { type: string; messageID?: string })
        .filter((action) => action?.type === 'END_MESSAGE_STREAMING')
        .map((action) => action.messageID);
      expect(ended.sort()).toEqual(['m1', 'm2']);
      expect(coord.hasStreamingMessages()).toBe(false);
    });

    it('endAllStreaming is a no-op when nothing is registered', async () => {
      const { manager, dispatch } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'done')
      );

      dispatch.mockClear();
      coord.endAllStreaming();

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('drains on clear and clearAll', async () => {
      const { manager } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'a')
      );
      coord.clear('m1');
      expect(coord.hasStreamingMessages()).toBe(false);

      await coord.upsert('m2', MessageState.STREAMING, () =>
        textResponse('m2', 'b')
      );
      coord.clearAll();
      expect(coord.hasStreamingMessages()).toBe(false);
    });

    it('drops the registration and hides the button even when the slot fan-out throws', async () => {
      const {
        manager,
        state,
        dispatch,
        chatActions,
        hideStopStreamingButtonIfIdle,
      } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.STREAMING, () =>
        textResponse('m1', 'partial')
      );

      // Make the fan-out loop actually run for m1. It skips items whose reference the
      // reducer reused verbatim, so the dispatch has to hand back a fresh object the way
      // the real reducer does for a changed item.
      state.assistantMessageState.localMessageIDs = ['local1'];
      dispatch.mockImplementation((action: { type: string; message?: any }) => {
        if (action.type === 'UPSERT_MESSAGE' && action.message?.id) {
          state.allMessagesByID[action.message.id] = action.message;
          state.allMessageItemsByID = {
            local1: { ui_state: { id: 'local1' }, fullMessageID: 'm1' },
          };
        }
      });

      // The event bus does not swallow listener exceptions, so everything after
      // fanOutChangedSlots is skipped — the registration has to already be gone by then.
      chatActions.handleUserDefinedResponseItems.mockRejectedValueOnce(
        new Error('listener blew up')
      );

      await expect(
        coord.upsert('m1', MessageState.COMPLETE, () =>
          textResponse('m1', 'done')
        )
      ).rejects.toThrow('listener blew up');

      expect(coord.hasStreamingMessages()).toBe(false);
      expect(hideStopStreamingButtonIfIdle).toHaveBeenCalledTimes(1);
    });

    it('leaves the stop button alone for a COMPLETE upsert of a message that never streamed', async () => {
      // The button may be up for another request (showStopButtonImmediately); an upsert
      // that did not stream has nothing to take down.
      const { manager, hideStopStreamingButtonIfIdle } = makeStubManager();
      const coord = new MessageUpsertCoordinator(manager);

      await coord.upsert('m1', MessageState.COMPLETE, () =>
        textResponse('m1', 'one shot')
      );

      expect(hideStopStreamingButtonIfIdle).not.toHaveBeenCalled();
    });
  });
});
