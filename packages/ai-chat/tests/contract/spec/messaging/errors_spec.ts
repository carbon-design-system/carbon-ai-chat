/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  CancellationReason,
  ChatInstance,
  MessageErrorState,
  MessageResponseTypes,
  MessageState,
  OnErrorData,
  OnErrorType,
  PublicConfigMessaging,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  FakeBackend,
  StartedSend,
  contractChat,
  contractCleanup,
  describeShared,
  fakeBackend,
  finishSend,
  startSend,
  textResponse,
} from '../../helpers';

/** What a send's promise settled with. */
type Outcome = { resolved: true } | { resolved: false; error: unknown };

/** Records how a send in flight settles, so its rejection is always handled. */
function outcomeOf(started: StartedSend): Promise<Outcome> {
  return started.done.then(
    (): Outcome => ({ resolved: true }),
    (error: unknown): Outcome => ({ resolved: false, error })
  );
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** The error state the chat wrote on a message in state. */
function errorStateOf(chat: ContractDriver, id: string) {
  return chat.messages().find((message) => message.id === id)?.history
    ?.error_state;
}

// @covers config.messaging.messageTimeoutSecs export.aiChatEntry.CancellationReason
// @covers state.status state.messages export.aiChatEntry.MessageErrorState
// @covers instance.messaging.addMessage instance.messaging.addMessageChunk
// @covers instance.messaging.upsertMessage export.aiChatEntry.MessageState
describeShared('message timeout', (makeDriver) => {
  afterEach(() => {
    jest.useRealTimers();
    contractCleanup();
  });

  /** A driver whose send timers are fake, and a send the backend holds open. */
  async function timedSend(messaging: Partial<PublicConfigMessaging>) {
    const chat = await makeDriver({
      messaging: { skipWelcome: true, ...messaging },
    });
    jest.useFakeTimers();
    const started = await startSend(chat, 'hello');
    const outcome = outcomeOf(started);
    return { chat, started, outcome };
  }

  it('aborts the signal with the TIMEOUT reason once the timeout passes', async () => {
    const { started } = await timedSend({ messageTimeoutSecs: 2 });
    const { signal } = started.sent.options;
    await advance(1999);
    expect(signal.aborted).toBe(false);
    await advance(1);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.TIMEOUT);
  });

  it('rejects the send, marks the request failed, and reads error', async () => {
    const { chat, started, outcome } = await timedSend({
      messageTimeoutSecs: 2,
    });
    await advance(2000);
    const settled = await outcome;
    expect(settled.resolved).toBe(false);
    expect((settled as { error: Error }).error.message).toBe(
      CancellationReason.TIMEOUT
    );
    expect(chat.status()).toBe('error');
    expect(errorStateOf(chat, started.sent.request.id)).toBe(
      MessageErrorState.FAILED
    );
  });

  it('times out after 150 seconds by default', async () => {
    const { started } = await timedSend({});
    const { signal } = started.sent.options;
    await advance(149_999);
    expect(signal.aborted).toBe(false);
    await advance(1);
    expect(signal.reason).toBe(CancellationReason.TIMEOUT);
  });

  it('never times out when set to 0', async () => {
    const { chat, started } = await timedSend({ messageTimeoutSecs: 0 });
    await advance(600_000);
    expect(started.sent.options.signal.aborted).toBe(false);
    expect(chat.status()).toBe('submitted');
  });

  it.each([
    [
      'addMessage',
      (chat: ContractDriver, requestID: string) =>
        chat.messaging.addMessage(
          textResponse('hi', 'r1', { request_id: requestID })
        ),
    ],
    [
      'addMessageChunk',
      (chat: ContractDriver, requestID: string) =>
        chat.messaging.addMessageChunk({
          partial_item: {
            response_type: MessageResponseTypes.TEXT,
            text: 'hi',
            streaming_metadata: { id: 'item-1' },
          },
          streaming_metadata: { response_id: 'r1', request_id: requestID },
        }),
    ],
    [
      'upsertMessage',
      (chat: ContractDriver, requestID: string) =>
        chat.messaging.upsertMessage('r1', MessageState.STREAMING, () =>
          textResponse('hi', 'r1', { request_id: requestID })
        ),
    ],
  ])(
    'ends the timeout window when %s writes a response',
    async (_name, write) => {
      const { chat, started } = await timedSend({ messageTimeoutSecs: 2 });
      await advance(1000);
      await act(async () => {
        await write(chat, started.sent.request.id);
      });
      await advance(10_000);
      expect(started.sent.options.signal.aborted).toBe(false);
    }
  );

  it('keeps error when the sender settles after the timeout', async () => {
    const { chat, started, outcome } = await timedSend({
      messageTimeoutSecs: 2,
    });
    await advance(2000);
    await act(async () => {
      started.sent.resolve();
      await outcome;
    });
    expect(chat.status()).toBe('error');
  });
});

// @covers config.messaging.customSendMessage state.status state.messages
// @covers export.aiChatEntry.MessageErrorState instance.send
// @covers response-type.inline_error
describeShared('send failure', (makeDriver) => {
  afterEach(contractCleanup);

  async function failedSend(
    chat: ContractDriver,
    error: unknown,
    options?: { silent?: boolean }
  ) {
    const started = await startSend(chat, 'hello', options);
    const outcome = outcomeOf(started);
    await act(async () => {
      started.sent.reject(error);
      await outcome;
    });
    return { started, settled: await outcome };
  }

  it('rejects the send with the rejection text when customSendMessage rejects', async () => {
    const chat = await makeDriver({ messaging: { skipWelcome: true } });
    const { settled } = await failedSend(chat, 'backend down');
    expect(settled.resolved).toBe(false);
    expect((settled as { error: Error }).error).toBeInstanceOf(Error);
    expect((settled as { error: Error }).error.message).toBe('backend down');
  });

  it('marks the request failed and reads error', async () => {
    const chat = await makeDriver({ messaging: { skipWelcome: true } });
    const { started } = await failedSend(chat, 'backend down');
    expect(chat.status()).toBe('error');
    expect(chat.messages().map((message) => message.id)).toEqual([
      started.sent.request.id,
    ]);
    expect(errorStateOf(chat, started.sent.request.id)).toBe(
      MessageErrorState.FAILED
    );
  });

  it('adds an inline error response after a silent send fails', async () => {
    const chat = await makeDriver({ messaging: { skipWelcome: true } });
    const { started } = await failedSend(chat, 'backend down', {
      silent: true,
    });
    const messages = chat.messages();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(started.sent.request.id);
    const reply = messages[1] as {
      output?: { generic?: { response_type: string }[] };
    };
    expect(reply.output.generic.map((item) => item.response_type)).toEqual([
      MessageResponseTypes.INLINE_ERROR,
    ]);
  });

  it('adds no inline error response after a visible send fails', async () => {
    const chat = await makeDriver({ messaging: { skipWelcome: true } });
    await failedSend(chat, 'backend down');
    expect(chat.messages()).toHaveLength(1);
  });

  it('leaves error for submitted on the next send, and ready once it settles', async () => {
    const chat = await makeDriver({ messaging: { skipWelcome: true } });
    await failedSend(chat, 'backend down');
    const next = await startSend(chat, 'again');
    expect(chat.status()).toBe('submitted');
    await finishSend(next);
    await waitFor(() => expect(chat.status()).toBe('ready'));
    expect(errorStateOf(chat, next.sent.request.id)).toBeUndefined();
  });
});

/** Mounts with an `onError` that records each call. */
async function mountWithOnError(
  messaging: Partial<PublicConfigMessaging> = {},
  extra: { openChatByDefault?: boolean } = {}
): Promise<{
  instance: ChatInstance;
  backend: FakeBackend;
  errors: OnErrorData[];
}> {
  const backend = fakeBackend();
  const errors: OnErrorData[] = [];
  const { instance } = await contractChat({
    ...extra,
    onError: (data) => {
      errors.push(data);
    },
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
      ...messaging,
    },
  });
  return { instance, backend, errors };
}

// @covers config.onError export.aiChatEntry.OnErrorType
// @covers config.messaging.messageTimeoutSecs config.messaging.customSendMessage
describe('onError for messaging failures', () => {
  afterEach(() => {
    jest.useRealTimers();
    contractCleanup();
  });

  async function rejectSend(
    instance: ChatInstance,
    backend: FakeBackend,
    error: unknown
  ): Promise<unknown> {
    let rejection: unknown;
    let done: Promise<void>;
    await act(async () => {
      done = instance.send('hello').catch((caught) => {
        rejection = caught;
      });
    });
    const sent = await backend.next();
    await act(async () => {
      sent.reject(error);
      await done;
    });
    return rejection;
  }

  it('reports a string rejection as MESSAGE_COMMUNICATION with the string as otherData', async () => {
    const { instance, backend, errors } = await mountWithOnError();
    await rejectSend(instance, backend, 'backend down');
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: 'An error occurred sending a message',
        otherData: 'backend down',
      },
    ]);
  });

  it('reports an Error rejection with its JSON as otherData', async () => {
    const { instance, backend, errors } = await mountWithOnError();
    const rejection = await rejectSend(
      instance,
      backend,
      new Error('backend down')
    );
    // On `main` the rejection goes through `JSON.stringify`, so an `Error`
    // loses its message: `otherData` and the send's own error read "{}".
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: 'An error occurred sending a message',
        otherData: '{}',
      },
    ]);
    expect((rejection as Error).message).toBe('{}');
  });

  it('reports one error per failed send', async () => {
    const { instance, backend, errors } = await mountWithOnError();
    await rejectSend(instance, backend, 'first');
    await rejectSend(instance, backend, 'second');
    expect(errors.map((error) => error.otherData)).toEqual(['first', 'second']);
  });

  it('reports a timeout once, with the TIMEOUT reason as its message', async () => {
    const { instance, backend, errors } = await mountWithOnError({
      messageTimeoutSecs: 2,
    });
    jest.useFakeTimers();
    await act(async () => {
      instance.send('hello').catch((): void => undefined);
    });
    await backend.next();
    await advance(1999);
    expect(errors).toEqual([]);
    await advance(1);
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: CancellationReason.TIMEOUT,
        otherData: undefined,
      },
    ]);
  });

  it('reports nothing while a send succeeds', async () => {
    const { instance, backend, errors } = await mountWithOnError();
    let done: Promise<void>;
    await act(async () => {
      done = instance.send('hello');
    });
    const sent = await backend.next();
    await act(async () => {
      sent.resolve();
      await done;
    });
    expect(errors).toEqual([]);
  });
});

// @covers config.onError export.aiChatEntry.OnErrorType state.status
// @covers event.chat:ready config.openChatByDefault state.messages
// @covers export.aiChatEntry.MessageErrorState
describe('a failed welcome request', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(contractCleanup);

  it('reports MESSAGE_COMMUNICATION, reads error, and still fires chat:ready', async () => {
    let ready = 0;
    const backend = fakeBackend();
    const errors: OnErrorData[] = [];
    const { instance } = await contractChat({
      openChatByDefault: true,
      onError: (data) => {
        errors.push(data);
      },
      messaging: { customSendMessage: backend.customSendMessage },
      onBeforeRender: (handed) => {
        handed.on({
          type: BusEventType.CHAT_READY,
          handler: () => {
            ready += 1;
          },
        });
      },
    });
    const sent = await backend.next();
    await act(async () => {
      sent.reject('welcome failed');
    });
    await waitFor(() => expect(ready).toBe(1));
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: 'An error occurred sending a message',
        otherData: 'welcome failed',
      },
    ]);
    expect(instance.getState().status).toBe('error');
    const [welcome] = instance.getState().messages;
    expect(welcome.id).toBe(sent.request.id);
    expect(welcome.history?.error_state).toBe(MessageErrorState.FAILED);
    // The welcome request is sent without the `silent` send option, so no
    // inline error response is added.
    expect(instance.getState().messages).toHaveLength(1);
  });
});
