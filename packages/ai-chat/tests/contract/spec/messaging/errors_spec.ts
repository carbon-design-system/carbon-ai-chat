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
  MessageErrorState,
  MessageResponseTypes,
  MessageState,
  OnErrorData,
  OnErrorType,
  PublicConfigMessaging,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  DriverFactory,
  SEND_ERROR_MESSAGE,
  StartedSend,
  advance,
  contractChat,
  contractSetup,
  countChatReady,
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
  });

  /** A driver whose send timers are fake, and a send the backend holds open. */
  async function timedSend(messaging: Partial<PublicConfigMessaging>) {
    const chat = await makeDriver({ messaging });
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
    const chat = await makeDriver();
    const { settled } = await failedSend(chat, 'backend down');
    expect(settled.resolved).toBe(false);
    expect((settled as { error: Error }).error).toBeInstanceOf(Error);
    expect((settled as { error: Error }).error.message).toBe('backend down');
  });

  it('marks the request failed and reads error', async () => {
    const chat = await makeDriver();
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
    const chat = await makeDriver();
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
    const chat = await makeDriver();
    await failedSend(chat, 'backend down');
    expect(chat.messages()).toHaveLength(1);
  });

  it('leaves error for submitted on the next send, and ready once it settles', async () => {
    const chat = await makeDriver();
    await failedSend(chat, 'backend down');
    const next = await startSend(chat, 'again');
    expect(chat.status()).toBe('submitted');
    await finishSend(next);
    await waitFor(() => expect(chat.status()).toBe('ready'));
    expect(errorStateOf(chat, next.sent.request.id)).toBeUndefined();
  });
});

/** Makes a driver whose `onError` records each call. */
async function driverWithOnError(
  makeDriver: DriverFactory,
  messaging: Partial<PublicConfigMessaging> = {}
): Promise<{ chat: ContractDriver; errors: OnErrorData[] }> {
  const errors: OnErrorData[] = [];
  const chat = await makeDriver({
    onError: (data) => {
      errors.push(data);
    },
    messaging,
  });
  return { chat, errors };
}

// @covers config.onError export.aiChatEntry.OnErrorType
// @covers config.messaging.messageTimeoutSecs config.messaging.customSendMessage
describeShared('onError for messaging failures', (makeDriver) => {
  afterEach(() => {
    jest.useRealTimers();
  });

  async function rejectSend(
    chat: ContractDriver,
    error: unknown
  ): Promise<unknown> {
    const started = await startSend(chat, 'hello');
    const outcome = outcomeOf(started);
    await act(async () => {
      started.sent.reject(error);
      await outcome;
    });
    const settled = await outcome;
    return 'error' in settled ? settled.error : undefined;
  }

  it('reports a string rejection as MESSAGE_COMMUNICATION with the string as otherData', async () => {
    const { chat, errors } = await driverWithOnError(makeDriver);
    await rejectSend(chat, 'backend down');
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: SEND_ERROR_MESSAGE,
        otherData: 'backend down',
      },
    ]);
  });

  it('reports an Error rejection with its message as otherData and in the send rejection', async () => {
    const { chat, errors } = await driverWithOnError(makeDriver);
    const rejection = await rejectSend(chat, new Error('backend down'));
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: SEND_ERROR_MESSAGE,
        otherData: 'backend down',
      },
    ]);
    expect((rejection as Error).message).toBe('backend down');
  });

  it('reports a non-Error object rejection with its JSON as otherData', async () => {
    const { chat, errors } = await driverWithOnError(makeDriver);
    const rejection = await rejectSend(chat, { code: 503 });
    expect(errors.map((error) => error.otherData)).toEqual(['{"code":503}']);
    expect((rejection as Error).message).toBe('{"code":503}');
  });

  it('reports one error per failed send', async () => {
    const { chat, errors } = await driverWithOnError(makeDriver);
    await rejectSend(chat, 'first');
    await rejectSend(chat, 'second');
    expect(errors.map((error) => error.otherData)).toEqual(['first', 'second']);
  });

  it('reports a timeout once, with the TIMEOUT reason as its message', async () => {
    const { chat, errors } = await driverWithOnError(makeDriver, {
      messageTimeoutSecs: 2,
    });
    jest.useFakeTimers();
    const started = await startSend(chat, 'hello');
    started.done.catch((): void => undefined);
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
    const { chat, errors } = await driverWithOnError(makeDriver);
    await finishSend(await startSend(chat, 'hello'));
    expect(errors).toEqual([]);
  });
});

// @covers config.onError export.aiChatEntry.OnErrorType state.status
// @covers event.chat:ready config.openChatByDefault state.messages
// @covers export.aiChatEntry.MessageErrorState event.pre:send
describe('a failed welcome request', () => {
  contractSetup();

  it('reports MESSAGE_COMMUNICATION, reads error, and still fires chat:ready', async () => {
    const ready = countChatReady();
    const backend = fakeBackend();
    const errors: OnErrorData[] = [];
    const { instance } = await contractChat({
      openChatByDefault: true,
      onError: (data) => {
        errors.push(data);
      },
      messaging: { customSendMessage: backend.customSendMessage },
      onBeforeRender: ready.onBeforeRender,
    });
    const sent = await backend.next();
    await act(async () => {
      sent.reject('welcome failed');
    });
    await waitFor(() => expect(ready.count()).toBe(1));
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: SEND_ERROR_MESSAGE,
        otherData: 'welcome failed',
      },
    ]);
    expect(instance.getState().status).toBe('error');
    const [welcome] = instance.getState().messages;
    expect(welcome.id).toBe(sent.request.id);
    expect(welcome.history?.error_state).toBe(MessageErrorState.FAILED);
    // The welcome request is silent, but its failure adds no inline error
    // response.
    expect(instance.getState().messages).toHaveLength(1);
  });

  it('reports only MESSAGE_COMMUNICATION after a throwing pre:send handler, reads error, and still fires chat:ready', async () => {
    const ready = countChatReady();
    const backend = fakeBackend();
    const errors: OnErrorData[] = [];
    const { instance } = await contractChat({
      openChatByDefault: true,
      onError: (data) => {
        errors.push(data);
      },
      messaging: { customSendMessage: backend.customSendMessage },
      onBeforeRender: (chatInstance) => {
        ready.onBeforeRender(chatInstance);
        chatInstance.on({
          type: BusEventType.PRE_SEND,
          handler: () => {
            throw new Error('welcome handler failed');
          },
        });
      },
    });
    await waitFor(() => expect(ready.count()).toBe(1));
    expect(errors).toEqual([
      {
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: SEND_ERROR_MESSAGE,
        otherData: 'welcome handler failed',
      },
    ]);
    expect(instance.getState().status).toBe('error');
    expect(backend.requests).toHaveLength(0);
    const messages = instance.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].history?.error_state).toBe(MessageErrorState.FAILED);
  });
});
