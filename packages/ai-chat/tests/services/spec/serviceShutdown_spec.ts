/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../../src/shared/store/actions';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { CustomSendMessageOptions } from '../../../src/types/config/MessagingConfig';
import type {
  MessageRequest,
  MessageResponse,
} from '../../../src/types/messaging/Messages';
import {
  MessageInputType,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const reply = (request: MessageRequest): MessageResponse => ({
  id: `reply-${request.id}`,
  request_id: request.id,
  output: {
    generic: [{ response_type: MessageResponseTypes.TEXT, text: 'late' }],
  },
});

/** A chat whose sends wait until the test releases them. */
async function heldChat(config: Partial<PublicConfig> = {}) {
  const held: Array<{
    request: MessageRequest;
    signal: AbortSignal;
    release: () => void;
  }> = [];
  const chat = await renderChatAndGetInstanceWithStore({
    ...createBaseConfig(),
    ...config,
    messaging: {
      skipWelcome: true,
      ...config.messaging,
      customSendMessage: (request, options: CustomSendMessageOptions) => {
        const done = resolvablePromise<void>();
        held.push({
          request,
          signal: options.signal,
          release: () => done.doResolve(),
        });
        return done;
      },
    },
  });
  // `instance.serviceManager` is a plain copy for tests; the coordinator holds
  // the real one.
  const serviceManager = (
    chat.serviceManager.messageCoordinator as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const send = async (text: string) => {
    void serviceManager.messageCoordinator
      .send(text, MessageSendSource.MESSAGE_INPUT)
      .catch(() => {});
    await flush();
  };
  return { ...chat, serviceManager, held, send, flush };
}

describe('ServiceManager.shutdown', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('releases store subscriptions and ignores later dispatches (O1)', async () => {
    const onStateChange = jest.fn();
    const chat = await heldChat({ persistedState: { onStateChange } });
    const storeListener = jest.fn();
    const publicListener = jest.fn();
    chat.serviceManager.store.subscribe(storeListener);
    chat.instance.state.subscribe(publicListener);
    const before = chat.store.getState();
    onStateChange.mockClear();

    await chat.serviceManager.shutdown();
    chat.serviceManager.store.dispatch(actions.setIsRestarting(true));
    chat.serviceManager.store.subscribe(storeListener);
    chat.serviceManager.store.dispatch(actions.setIsRestarting(true));

    expect(chat.store.getState()).toBe(before);
    expect(storeListener).not.toHaveBeenCalled();
    expect(publicListener).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('removes its event-bus handlers (O2)', async () => {
    const chat = await heldChat();
    const handler = jest.fn();
    chat.instance.on({ type: BusEventType.RESTART_CONVERSATION, handler });

    await chat.serviceManager.shutdown();
    await chat.serviceManager.fire({
      type: BusEventType.RESTART_CONVERSATION,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops the message timeout and loading timers (O3)', async () => {
    const chat = await heldChat({ messaging: { messageTimeoutSecs: 30 } });
    const manager =
      chat.serviceManager.messageCoordinator.messageLoadingManager;
    const end = jest.spyOn(manager, 'end');
    const cancel = jest.spyOn(
      chat.serviceManager.messageCoordinator,
      'cancelMessageRequestByID'
    );
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    try {
      void chat.serviceManager.messageCoordinator
        .send('hello', MessageSendSource.MESSAGE_INPUT)
        .catch(() => {});
      await jest.advanceTimersByTimeAsync(10);
      expect(chat.held).toHaveLength(1);

      await chat.serviceManager.shutdown();
      expect(end).toHaveBeenCalled();
      cancel.mockClear();

      // Past the 30-second timeout: nothing is left to fire it.
      await jest.advanceTimersByTimeAsync(60_000);
      expect(cancel).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('aborts running requests and uploads (O4)', async () => {
    const uploads: AbortSignal[] = [];
    const chat = await heldChat({
      upload: {
        isOn: true,
        onFileUpload: (_file: File, signal: AbortSignal) => {
          uploads.push(signal);
          return new Promise(() => {});
        },
      },
    });
    await chat.send('hello');
    void chat.serviceManager.inputActionsService.handleFileSelectedForUpload(
      new File(['x'], 'x.txt')
    );
    await chat.flush();
    expect(chat.held[0].signal.aborted).toBe(false);
    expect(uploads[0].aborted).toBe(false);

    await chat.serviceManager.shutdown();

    expect(chat.held[0].signal.aborted).toBe(true);
    expect(uploads[0].aborted).toBe(true);
  });

  it('keeps the saved session as it was at shutdown (O6)', async () => {
    const chat = await heldChat();
    await chat.send('hello');
    const saved = { ...sessionStorage };
    expect(Object.keys(saved)).not.toHaveLength(0);

    await chat.serviceManager.shutdown();
    chat.serviceManager.store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: { hasSentNonWelcomeMessage: false },
      })
    );

    expect({ ...sessionStorage }).toEqual(saved);
  });

  it('does nothing more when repeated (O7)', async () => {
    const chat = await heldChat();
    const coordinatorShutdown = jest.spyOn(
      chat.serviceManager.messageCoordinator,
      'shutdown'
    );

    const first = chat.serviceManager.shutdown();
    const second = chat.serviceManager.shutdown();
    await first;
    await expect(chat.serviceManager.shutdown()).resolves.toBeUndefined();

    expect(second).toBe(first);
    expect(coordinatorShutdown).toHaveBeenCalledTimes(1);
    expect(chat.serviceManager.isShutdown).toBe(true);
  });

  it('reports shutdown to code its first steps call back into', async () => {
    const chat = await heldChat();
    await chat.send('hello');
    const seen: boolean[] = [];
    chat.held[0].signal.addEventListener('abort', () =>
      seen.push(chat.serviceManager.isShutdown)
    );

    await chat.serviceManager.shutdown();

    expect(seen).toEqual([true]);
  });

  it.each(['event', 'text'] as const)(
    'starts no %s queued behind a stream while shutdown cancels the stream (O4)',
    async (kind) => {
      const chat = await heldChat({ messaging: { messageTimeoutSecs: 0 } });
      await chat.send('first');
      await chat.instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'first-response' },
        partial_item: {
          streaming_metadata: { id: 'item-1' },
          response_type: MessageResponseTypes.TEXT,
          text: 'partial',
        },
      } as never);
      void chat.instance
        .send(
          kind === 'event'
            ? ({
                input: { message_type: MessageInputType.EVENT, text: 'queued' },
              } as never)
            : 'queued'
        )
        .catch(() => {});
      await chat.flush();
      expect(
        chat.serviceManager.messageCoordinator.getWaitingRequestCount()
      ).toBe(1);

      await chat.serviceManager.shutdown();
      await chat.flush();

      expect(chat.held.map(({ request }) => request.input.text)).toEqual([
        'first',
      ]);
      expect(chat.held[0].signal.aborted).toBe(true);
    }
  );

  it('asks the host for nothing new after shutdown (O10)', async () => {
    const onFileUpload = jest.fn(async () => ({}));
    const customLoadHistory = jest.fn(async (): Promise<never[]> => []);
    const chat = await heldChat({
      upload: { isOn: true, onFileUpload },
      messaging: { customLoadHistory },
    });
    customLoadHistory.mockClear();

    await chat.serviceManager.shutdown();
    await expect(chat.instance.send('late')).resolves.toBeUndefined();
    await chat.serviceManager.inputActionsService.handleFileSelectedForUpload(
      new File(['x'], 'x.txt')
    );
    await expect(
      chat.serviceManager.historyService.loadHistory()
    ).resolves.toBeNull();
    await chat.flush();

    expect(chat.held).toHaveLength(0);
    expect(onFileUpload).not.toHaveBeenCalled();
    expect(customLoadHistory).not.toHaveBeenCalled();
  });

  it('runs every step when one of them throws (O7)', async () => {
    const chat = await heldChat();
    await chat.send('hello');
    jest
      .spyOn(chat.serviceManager.publicStateService, 'destroy')
      .mockImplementation(() => {
        throw new Error('destroy failed');
      });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(chat.serviceManager.shutdown()).resolves.toBeUndefined();

    expect(chat.held[0].signal.aborted).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('keeps a late reply to a held send out of the chat (O10)', async () => {
    const chat = await heldChat();
    const receive = jest.fn();
    await chat.send('hello');
    const messageCount = chat.instance.state.get().messages.length;
    const before = chat.store.getState();

    await chat.serviceManager.shutdown();
    chat.instance.on({ type: BusEventType.RECEIVE, handler: receive });
    await chat.instance.messaging.addMessage(reply(chat.held[0].request));
    chat.held[0].release();
    await chat.flush();

    expect(chat.store.getState()).toBe(before);
    expect(chat.instance.state.get().messages).toHaveLength(messageCount);
    expect(receive).not.toHaveBeenCalled();
  });
});
