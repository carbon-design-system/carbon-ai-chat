/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `instance.messaging.failTurn()` and `clearError()` (#2354, PROPOSAL-2354). A host marks a turn
 * failed after `customSendMessage` resolved, the chat shows and announces it as it does a failure
 * it finds, and the host can clear the error without restarting.
 */

import { waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import enLanguagePack from '../../../../src/shared/languages/en.json';
import { resolvablePromise } from '../../../../src/shared/utils/resolvablePromise';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import {
  CancellationReason,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import type { PublicConfig } from '../../../../src/types/config/PublicConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import { MessageErrorState } from '../../../../src/types/messaging/LocalMessageItem';
import {
  MessageResponseTypes,
  type Message,
  type MessageRequest,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

// Records every announcement instead of speaking it.
const mockAnnounce = jest.fn();

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    ...jest.requireActual(
      '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js'
    ),
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: jest.fn(),
    }),
  })
);

type Stream = 'chunk' | 'upsert';

interface Turn {
  request: MessageRequest;
  signal: AbortSignal;
}

/**
 * A host that streams one partial response per request, unless `stream` is `'none'`. With
 * `resolve`, its `customSendMessage` resolves right after; otherwise it waits on that turn's hold.
 */
function host(stream: Stream | 'none', { resolve }: { resolve: boolean }) {
  const turns: Turn[] = [];
  const log: string[] = [];
  const holds: ReturnType<typeof resolvablePromise<void>>[] = [];
  const customSendMessage = async (
    request: MessageRequest,
    { signal }: { signal: AbortSignal },
    instance: ChatInstance
  ) => {
    turns.push({ request, signal });
    const hold = resolvablePromise<void>();
    holds.push(hold);
    signal.addEventListener('abort', () => log.push(`abort ${signal.reason}`));
    if (stream !== 'none') {
      await writePartial(
        instance,
        stream,
        request,
        `response-${turns.length}`,
        'Partial'
      );
    }
    if (!resolve) {
      await hold;
    }
  };
  return { turns, log, holds, customSendMessage };
}

async function writePartial(
  instance: ChatInstance,
  stream: Stream,
  request: MessageRequest,
  responseID: string,
  text: string
) {
  if (stream === 'chunk') {
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseID },
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: 'item-1' },
      },
    });
    return;
  }
  await instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    (): MessageResponse => ({
      id: responseID,
      request_id: request.id,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text }],
      },
    })
  );
}

async function chatWith(
  sender: ReturnType<typeof host>,
  config: Partial<PublicConfig> = {}
) {
  const onError = jest.fn();
  const instance = await renderChatAndGetInstance({
    ...createBaseConfig(),
    onError,
    ...config,
    messaging: {
      skipWelcome: true,
      customSendMessage: sender.customSendMessage,
      ...config.messaging,
    },
  });
  // Open the window first, so sends queue in the order made (06b's DEFERRED note).
  await instance.changeView(ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.state.get().status).toBe('ready'));
  instance.on({
    type: BusEventType.STOP_STREAMING,
    handler: () => {
      sender.log.push('stopStreaming');
    },
  });
  mockAnnounce.mockClear();
  return { instance, onError };
}

function messageOf(instance: ChatInstance, id: string) {
  return instance.state.get().messages.find((item) => item.id === id) as
    Message | undefined;
}

function textOf(instance: ChatInstance, responseID: string) {
  return (
    messageOf(instance, responseID) as MessageResponse
  )?.output.generic.map((item) => 'text' in item && item.text);
}

function hasSystemMessage(instance: ChatInstance) {
  return instance.state
    .get()
    .messages.some((message) =>
      (message as MessageResponse).output?.generic?.some(
        (item) => item.response_type === MessageResponseTypes.SYSTEM
      )
    );
}

/** The failure announcements made so far. */
function failureAnnouncements() {
  return mockAnnounce.mock.calls.filter(([text]) =>
    String(text).includes(enLanguagePack.errors_ariaMessageFailed)
  );
}

/** Lets React commit and the announcer's microtask flush. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

/** Sends one message whose response streams on after the send resolves: #2354's main case. */
async function streamingTurn(stream: Stream) {
  const sender = host(stream, { resolve: true });
  const chat = await chatWith(sender);
  await chat.instance.messaging.send('Hello');
  await waitFor(() =>
    expect(chat.instance.state.get().status).toBe('streaming')
  );
  return { sender, ...chat, request: sender.turns[0].request };
}

describe('messaging.failTurn (#2354)', () => {
  beforeEach(() => {
    setupBeforeEach();
    sessionStorage.clear();
    localStorage.clear();
    mockAnnounce.mockClear();
  });
  afterEach(setupAfterEach);

  it.each<Stream>(['chunk', 'upsert'])(
    'fails a %s turn whose send already resolved: error state, the inline error, one announcement (O1, O3, O4)',
    async (stream) => {
      const { instance, sender, onError, request } =
        await streamingTurn(stream);

      await instance.messaging.failTurn();

      expect(instance.state.get().status).toBe('error');
      expect(instance.state.get().error).toEqual({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: 'The turn was marked failed.',
        otherData: undefined,
        messageID: request.id,
      });
      // The response keeps its content and shows the streaming failure; the request isn't marked.
      expect(textOf(instance, 'response-1')).toEqual(['Partial']);
      expect(messageOf(instance, 'response-1').history.error_state).toBe(
        MessageErrorState.FAILED_WHILE_STREAMING
      );
      expect(messageOf(instance, request.id).history.error_state).not.toBe(
        MessageErrorState.FAILED
      );
      // Aborted like a timeout, not a stop: no stopStreaming, no "Request canceled" note.
      expect(sender.log).toEqual([`abort ${CancellationReason.TURN_FAILED}`]);
      expect(hasSystemMessage(instance)).toBe(false);
      expect(onError).not.toHaveBeenCalled();

      await settle();
      expect(failureAnnouncements()).toHaveLength(1);
      const shadow = getChatShadowRoot();
      expect(
        deepQuerySelector(shadow, '.cds-aichat--inline-error')
      ).toBeTruthy();
      expect(
        deepQuerySelector(shadow, '.cds-aichat--message-error-failed')
      ).toBeFalsy();
    }
  );

  it('marks the request failed when its turn has no response, as a failed send does (O3, O4)', async () => {
    const sender = host('none', { resolve: true });
    const { instance, onError } = await chatWith(sender);
    await instance.messaging.send('Hello');
    expect(instance.state.get().status).toBe('ready');

    await instance.messaging.failTurn();

    const { request } = sender.turns[0];
    expect(instance.state.get().status).toBe('error');
    expect(instance.state.get().error.messageID).toBe(request.id);
    expect(messageOf(instance, request.id).history.error_state).toBe(
      MessageErrorState.FAILED
    );
    expect(onError).not.toHaveBeenCalled();
    await settle();
    expect(failureAnnouncements()).toHaveLength(1);
    expect(
      deepQuerySelector(
        getChatShadowRoot(),
        '.cds-aichat--message-error-failed'
      )
    ).toBeTruthy();
  });

  it.each<[Stream, string, (request: MessageRequest) => string]>([
    ['chunk', 'the request ID', (request) => request.id],
    ['chunk', 'a response ID', () => 'response-1'],
    ['chunk', 'nothing', () => undefined],
    ['upsert', 'the request ID', (request) => request.id],
    ['upsert', 'a response ID', () => 'response-1'],
    ['upsert', 'nothing', () => undefined],
  ])(
    'names a %s turn by its request ID when given %s (O2)',
    async (stream, _, idOf) => {
      const { instance, request } = await streamingTurn(stream);

      await instance.messaging.failTurn({ messageID: idOf(request) });

      expect(instance.state.get().error.messageID).toBe(request.id);
    }
  );

  it.each<Stream>(['chunk', 'upsert'])(
    'finds a %s turn whose request a pre:send handler renamed, and reports the name the host got',
    async (stream) => {
      const sender = host(stream, { resolve: true });
      const { instance } = await chatWith(sender);
      instance.on({
        type: BusEventType.PRE_SEND,
        handler: (event: any) => {
          event.data.id = `renamed-${event.data.id}`;
        },
      });
      await instance.messaging.send('Hello');
      await waitFor(() =>
        expect(instance.state.get().status).toBe('streaming')
      );
      const hostID = sender.turns[0].request.id;
      expect(hostID).toMatch(/^renamed-/);

      await instance.messaging.failTurn({ messageID: hostID });

      expect(instance.state.get().status).toBe('error');
      expect(instance.state.get().error.messageID).toBe(hostID);
      expect(messageOf(instance, 'response-1').history.error_state).toBe(
        MessageErrorState.FAILED_WHILE_STREAMING
      );
      // A repeat call by the same name finds the same turn.
      await instance.messaging.failTurn({
        messageID: hostID,
        error: { message: 'Again' },
      });
      expect(instance.state.get().error).toMatchObject({
        message: 'Again',
        messageID: hostID,
      });
    }
  );

  it('fails an older turn still streaming while a newer one runs, leaving the newer one alone', async () => {
    // The first turn resolves and keeps streaming; the second holds, so it stays the current request.
    const sender = host('none', { resolve: true });
    const holdSecond = resolvablePromise<void>();
    sender.customSendMessage = async (request, { signal }, instance) => {
      sender.turns.push({ request, signal });
      signal.addEventListener('abort', () =>
        sender.log.push(`abort ${request.id} ${signal.reason}`)
      );
      if (sender.turns.length === 1) {
        await writePartial(instance, 'upsert', request, 'response-1', 'One');
        return;
      }
      await holdSecond;
    };
    const { instance } = await chatWith(sender);
    await instance.messaging.send('First');
    const second = instance.messaging.send('Second');
    await waitFor(() => expect(sender.turns).toHaveLength(2));
    const [first, next] = sender.turns;

    await instance.messaging.failTurn({ messageID: 'response-1' });

    expect(instance.state.get().error.messageID).toBe(first.request.id);
    expect(messageOf(instance, 'response-1').history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    expect(sender.log).toEqual([
      `abort ${first.request.id} ${CancellationReason.TURN_FAILED}`,
    ]);
    // The newer turn still runs, and its send resolves as usual.
    expect(next.signal.aborted).toBe(false);
    holdSecond.doResolve();
    await second;
    expect(instance.state.get().status).toBe('error');
  });

  it('settles a stream with no request_id as part of the last turn', async () => {
    const sender = host('none', { resolve: true });
    const { instance } = await chatWith(sender);
    await instance.messaging.send('Hello');
    await instance.messaging.upsertMessage(
      'ownerless',
      MessageState.STREAMING,
      (): MessageResponse => ({
        id: 'ownerless',
        output: {
          generic: [{ response_type: MessageResponseTypes.TEXT, text: 'x' }],
        },
      })
    );
    expect(instance.state.get().status).toBe('streaming');

    await instance.messaging.failTurn();

    expect(messageOf(instance, 'ownerless').history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    instance.messaging.clearError();
    expect(instance.state.get().status).toBe('ready');
  });

  it('does not abort a turn that already finished', async () => {
    const sender = host('none', { resolve: true });
    const { instance } = await chatWith(sender);
    await instance.messaging.send('Hello');

    await instance.messaging.failTurn();

    expect(instance.state.get().status).toBe('error');
    expect(sender.log).toEqual([]);
  });

  it('rejects a send still running, aborts it with TURN_FAILED, ignores its late resolve, and sends the queued turn', async () => {
    const sender = host('none', { resolve: false });
    const { instance } = await chatWith(sender);
    const first = instance.messaging.send('First');
    const second = instance.messaging.send('Second');
    await waitFor(() => expect(sender.turns).toHaveLength(1));
    expect(instance.state.get().status).toBe('submitted');

    await instance.messaging.failTurn({
      error: { message: 'The server went away.' },
    });

    await expect(first).rejects.toThrow('The server went away.');
    expect(sender.log).toEqual([`abort ${CancellationReason.TURN_FAILED}`]);
    expect(
      messageOf(instance, sender.turns[0].request.id).history.error_state
    ).toBe(MessageErrorState.FAILED);
    expect(hasSystemMessage(instance)).toBe(false);

    // The queued turn still goes out, and its start clears the error (O7).
    await waitFor(() => expect(sender.turns).toHaveLength(2));
    expect(instance.state.get().error).toBeNull();
    // A late resolve from the failed turn changes nothing.
    sender.holds[0].doResolve();
    await settle();
    expect(instance.state.get().status).toBe('submitted');
    sender.holds[1].doResolve();
    await second;
    expect(instance.state.get().status).toBe('ready');
  });

  it('rejects a running send whose response streams, marking the response and not the request', async () => {
    const sender = host('chunk', { resolve: false });
    const { instance } = await chatWith(sender);
    const sending = instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('streaming'));

    await instance.messaging.failTurn();

    await expect(sending).rejects.toThrow('The turn was marked failed.');
    const { request } = sender.turns[0];
    expect(messageOf(instance, 'response-1').history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    expect(messageOf(instance, request.id).history.error_state).not.toBe(
      MessageErrorState.FAILED
    );
    expect(instance.state.get().status).toBe('error');
    sender.holds[0].doResolve();
  });

  it.each<Stream>(['chunk', 'upsert'])(
    'keeps status error when a %s write arrives for the failed turn',
    async (stream) => {
      const { instance, request } = await streamingTurn(stream);
      await instance.messaging.failTurn();

      await writePartial(
        instance,
        stream,
        request,
        'response-1',
        'Partial and more'
      ).catch((): void => undefined);

      // As after a stop: a late chunk is dropped, and a late upsert is the host's own write.
      expect(textOf(instance, 'response-1')).toEqual(
        stream === 'chunk' ? ['Partial'] : ['Partial and more']
      );
      expect(instance.state.get().status).toBe('error');
      // The failure mark stays either way (O3, O6).
      expect(messageOf(instance, 'response-1').history.error_state).toBe(
        MessageErrorState.FAILED_WHILE_STREAMING
      );
    }
  );

  it('rejects an unknown ID, an earlier turn, and an empty conversation, without onError', async () => {
    const sender = host('none', { resolve: true });
    const { instance, onError } = await chatWith(sender);

    await expect(instance.messaging.failTurn()).rejects.toThrow(
      'The conversation has no turn to fail.'
    );
    await instance.messaging.send('First');
    await instance.messaging.send('Second');
    await expect(
      instance.messaging.failTurn({ messageID: 'no-such-message' })
    ).rejects.toThrow('No message has the ID "no-such-message"');
    await expect(
      instance.messaging.failTurn({
        messageID: sender.turns[0].request.id,
      })
    ).rejects.toThrow("isn't in the active or last turn");

    expect(instance.state.get().status).toBe('ready');
    expect(instance.state.get().error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('replaces the error on a failed turn without announcing again', async () => {
    const { instance, request } = await streamingTurn('upsert');
    await instance.messaging.failTurn({ error: { message: 'First' } });
    await settle();

    await instance.messaging.failTurn({
      messageID: 'response-1',
      error: { message: 'Second' },
    });

    expect(instance.state.get().error).toMatchObject({
      message: 'Second',
      messageID: request.id,
    });
    await settle();
    expect(failureAnnouncements()).toHaveLength(1);
  });

  it('freezes state.error but keeps otherData by reference', async () => {
    const { instance } = await streamingTurn('upsert');
    const cause = new Error('socket closed');

    await instance.messaging.failTurn({ error: { otherData: cause } });

    const { error } = instance.state.get();
    expect(Object.isFrozen(error)).toBe(true);
    expect(error.otherData).toBe(cause);
  });
});

describe('messaging.clearError (#2354)', () => {
  beforeEach(() => {
    setupBeforeEach();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(setupAfterEach);

  it('returns status and error, and keeps the failed turn and its marks (O5, O6)', async () => {
    const { instance, request } = await streamingTurn('chunk');
    await instance.messaging.failTurn();

    instance.messaging.clearError();

    expect(instance.state.get().status).toBe('ready');
    expect(instance.state.get().error).toBeNull();
    expect(messageOf(instance, request.id)).toBeDefined();
    expect(textOf(instance, 'response-1')).toEqual(['Partial']);
    expect(messageOf(instance, 'response-1').history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
  });

  it('clears an error the chat found, and does nothing with no error', async () => {
    const { instance, onError } = await chatWith({
      ...host('none', { resolve: true }),
      customSendMessage: async () => {
        throw new Error('down');
      },
    });
    const before = instance.state.get();
    instance.messaging.clearError();
    expect(instance.state.get()).toBe(before);

    await instance.messaging.send('Hello').catch((): void => undefined);
    expect(instance.state.get().status).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);

    instance.messaging.clearError();

    expect(instance.state.get().status).toBe('ready');
    expect(instance.state.get().error).toBeNull();
  });

  it('is cleared by the next send (O7) and by a restart (O8)', async () => {
    const sender = host('none', { resolve: true });
    const { instance } = await chatWith(sender);
    await instance.messaging.send('First');
    await instance.messaging.failTurn();
    expect(instance.state.get().status).toBe('error');

    await instance.messaging.send('Second');
    expect(instance.state.get().error).toBeNull();
    expect(instance.state.get().status).toBe('ready');

    await instance.messaging.failTurn();
    expect(instance.state.get().status).toBe('error');
    await instance.messaging.restartConversation();
    expect(instance.state.get().error).toBeNull();
    expect(instance.state.get().status).not.toBe('error');
  });

  it('leaves the catastrophic error panel open (O9)', async () => {
    const { instance } = await streamingTurn('upsert');
    await instance.messaging.failTurn();
    instance.serviceManager.actions.errorOccurred({
      errorType: OnErrorType.RENDER,
      message: 'The chat failed.',
      catastrophicErrorType: true,
    });
    const panelOpen = () =>
      (instance.serviceManager.store.getState() as any).view
        .catastrophicErrorType;
    expect(panelOpen()).toBe(true);

    instance.messaging.clearError();

    expect(instance.state.get().error).toBeNull();
    expect(instance.state.get().status).toBe('ready');
    expect(panelOpen()).toBe(true);
  });
});
