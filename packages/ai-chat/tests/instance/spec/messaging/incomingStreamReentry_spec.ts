/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  CancellationReason,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import {
  type MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

function response(id: string): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: id,
          streaming_metadata: { id: 'text', cancellable: true },
        },
      ],
    },
  };
}

async function renderTwoStreams() {
  const signals = new Map<string, AbortSignal>();
  const config = createBaseConfig();
  config.messaging.customSendMessage = async (request, options, chat) => {
    const id = request.input.text;
    signals.set(id, options.signal);
    await chat.messaging.upsertMessage(id, MessageState.STREAMING, () =>
      response(id)
    );
  };
  const rendered = await renderChatAndGetInstanceWithStore(config);
  await act(async () => {
    await rendered.instance.send('a');
    await rendered.instance.send('b');
  });
  expect(signals.size).toBe(2);
  expect(signals.get('a')).not.toBe(signals.get('b'));
  for (const signal of signals.values()) {
    expect(signal.aborted).toBe(false);
  }
  expect(
    Array.from(
      rendered.serviceManager.messageCoordinator.incomingWriteLifetime.state
        .streamingIDs
    )
  ).toEqual(['a', 'b']);
  return { ...rendered, signals };
}

it('walks live stream IDs but aborts captured controllers after a store callback removes a stream', async () => {
  const { instance, store, serviceManager, signals } = await renderTwoStreams();
  const events: string[] = [];
  for (const [id, signal] of signals) {
    signal.addEventListener('abort', () => events.push(`abort ${id}`), {
      once: true,
    });
  }
  const endings = jest.spyOn(
    serviceManager.messageUpsertCoordinator,
    'endStreamingMessage'
  );
  let removal: Promise<void>;
  const unsubscribe = store.subscribe(() => {
    const item = store.getState().allMessageItemsByID['a-text'];
    if (!events.length && item.ui_state.streamingState.isDone) {
      events.push('a done');
      removal = instance.messaging.removeMessages(['b']);
      events.push('b removed');
    }
  });
  try {
    await act(async () => {
      await serviceManager.messageCoordinator.cancelCurrentMessageRequest();
      await removal;
    });
    expect(removal).toBeDefined();
    expect(events).toEqual(['a done', 'b removed', 'abort a', 'abort b']);
    expect(endings.mock.calls.map(([id]) => id)).toEqual(['a']);
    expect(
      store.getState().allMessageItemsByID['a-text'].ui_state.streamingState
        .isDone
    ).toBe(true);
    expect(store.getState().allMessagesByID.b).toBeUndefined();
    for (const signal of signals.values()) {
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe(CancellationReason.STOP_STREAMING);
    }
    expect(serviceManager.messageUpsertCoordinator.hasStreamingMessages()).toBe(
      false
    );
    expect(instance.state.get().status).toBe('ready');
  } finally {
    unsubscribe();
    endings.mockRestore();
  }
});

it('aborts the captured controllers before clearAll advances the generation and discards an abort-listener write', async () => {
  const { instance, store, serviceManager, signals } = await renderTwoStreams();
  const lifetime = serviceManager.messageCoordinator.incomingWriteLifetime;
  const originalGeneration = lifetime.state.generation;
  const aborts: { id: string; generation: number }[] = [];
  const updater = jest.fn(() => response('abort-write'));
  let removal: Promise<void>;
  let write: Promise<void>;
  for (const [id, signal] of signals) {
    signal.addEventListener(
      'abort',
      () => {
        aborts.push({ id, generation: lifetime.state.generation });
        if (id === 'a') {
          removal = instance.messaging.removeMessages(['b']);
          write = instance.messaging.upsertMessage(
            'abort-write',
            MessageState.COMPLETE,
            updater
          );
        }
      },
      { once: true }
    );
  }
  await act(async () => {
    await instance.messaging.restartConversation();
    await Promise.all([removal, write]);
  });
  expect(removal).toBeDefined();
  expect(write).toBeDefined();
  // Restart invalidates pending writes once before clearAll runs. Both aborts
  // still see that generation; clearAll advances it only after the callbacks.
  expect(aborts).toEqual([
    { id: 'a', generation: originalGeneration + 1 },
    { id: 'b', generation: originalGeneration + 1 },
  ]);
  expect(lifetime.state.generation).toBe(originalGeneration + 2);
  expect(updater).not.toHaveBeenCalled();
  expect(store.getState().allMessagesByID['abort-write']).toBeUndefined();
  expect(store.getState().allMessagesByID.a).toBeUndefined();
  expect(store.getState().allMessagesByID.b).toBeUndefined();
  for (const signal of signals.values()) {
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
  }
  expect(lifetime.streamingControllers.size).toBe(0);
  expect(lifetime.state.streamingIDs.size).toBe(0);
  expect(lifetime.chainByID.size).toBe(0);
  expect(lifetime.state.pendingWrites.size).toBe(0);
});
