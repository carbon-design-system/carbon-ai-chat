/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The stop control has no public test ID yet (MAIN-NOTES M23). These tests
 * rely on it taking the send button's place while it shows: the stop control
 * reads as the input being there with no send button, and the send control
 * as the send button being there.
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  CancellationReason,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  OnErrorType,
  PageObjectId,
  PublicConfig,
} from '../../../../src/aiChatEntry';
import {
  SEND_ERROR_MESSAGE,
  addChunk,
  allByRole,
  byRole,
  byTestId,
  click,
  completeText,
  contractChat,
  contractSetup,
  deferred,
  describeShared,
  fakeBackend,
  finalChunk,
  instanceSender,
  outputTexts,
  pause,
  partialText,
  partialUserDefined,
  recordEvents,
  shownText,
  startSend,
  textItem,
  textResponse,
  textsOf,
} from '../../helpers';

/** Swallows a value: an expected rejection, or an `onError` call. */
const ignore = (): void => undefined;

/** The input shows, and the stop control has taken the send button's place. */
const stopControlShown = () =>
  byTestId(PageObjectId.INPUT) !== null &&
  byTestId(PageObjectId.INPUT_SEND) === null;

/** The send button shows. */
const sendControlShown = () => byTestId(PageObjectId.INPUT_SEND) !== null;

// @covers instance.messaging.addMessageChunk event.chunk:userDefinedResponse config.onError state.status
// @covers export.aiChatEntry.OnErrorType
describeShared('errors during a stream', (makeDriver) => {
  it('rejects addMessageChunk with a chunk handler’s error, without onError, and keeps the item', async () => {
    const onError = jest.fn();
    const chat = await makeDriver({ onError });
    const failure = new Error('handler failed');
    chat.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: () => {
        throw failure;
      },
    });
    let caught: unknown;
    await act(async () => {
      await chat.messaging
        .addMessageChunk(partialUserDefined('u1', 'ud', { step: 1 }))
        .catch((error) => {
          caught = error;
        });
    });
    expect(caught).toBe(failure);
    expect(onError).not.toHaveBeenCalled();
    expect(chat.status()).toBe('ready');
    expect(chat.messages().map((message) => message.id)).toEqual(['u1']);
  });

  it('reports a chunk handler error the host rethrows from customSendMessage once, with its message', async () => {
    const onError = jest.fn();
    const chat = await makeDriver({ onError });
    chat.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: () => {
        throw new Error('handler failed');
      },
    });
    const started = await startSend(chat, 'hello');
    let chunkError: unknown;
    await act(async () => {
      await chat.messaging
        .addMessageChunk(partialUserDefined('u1', 'ud', { step: 1 }))
        .catch((error) => {
          chunkError = error;
        });
    });
    let sendError: unknown;
    await act(async () => {
      started.sent.reject(chunkError);
      await started.done.catch((error) => {
        sendError = error;
      });
    });
    expect(sendError).toEqual(new Error('handler failed'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: SEND_ERROR_MESSAGE,
      otherData: 'handler failed',
    });
    expect(chat.status()).toBe('error');
  });

  it('ignores a chunk for a stream whose send failed', async () => {
    const chat = await makeDriver({ onError: ignore });
    const started = await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello'));
    await act(async () => {
      started.sent.reject('backend went away');
      await started.done.catch(ignore);
    });
    await addChunk(chat, partialText('r1', 'a', ', more'));
    expect(textsOf(chat, 'r1')).toEqual(['Hello']);
    expect(chat.status()).toBe('error');
  });

  it('still appends a chunk that names the request whose send failed', async () => {
    const chat = await makeDriver({ onError: ignore });
    const started = await startSend(chat, 'hello');
    const named = (text: string) => {
      const chunk = partialText('r1', 'a', text);
      chunk.streaming_metadata = {
        response_id: 'r1',
        request_id: started.sent.request.id,
      };
      return chunk;
    };
    await addChunk(chat, named('Hello'));
    await act(async () => {
      started.sent.reject('backend went away');
      await started.done.catch(ignore);
    });
    await addChunk(chat, named(' more'));
    expect(textsOf(chat, 'r1')).toEqual(['Hello more']);
    expect(chat.status()).toBe('error');
  });
});

// @covers instance.messaging.restartConversation
// @covers instance.messaging.addMessageChunk state.messages state.status
describeShared('a restart during a stream', (makeDriver) => {
  it('drops a chunk for the stream it ended', async () => {
    const chat = await makeDriver();
    await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello'));
    await act(() => chat.messaging.restartConversation());
    await addChunk(chat, partialText('r1', 'a', ' again'));
    expect(chat.messages()).toEqual([]);
    expect(chat.status()).toBe('ready');
  });
});

/** Opens a chat with the fake backend and waits for its send button. */
async function openChat(config: Partial<PublicConfig> = {}) {
  const backend = fakeBackend();
  const mount = await contractChat({
    ...config,
    openChatByDefault: true,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
      ...config.messaging,
    },
  });
  return { ...mount, sender: instanceSender(mount.instance, backend) };
}

// @covers instance.messaging.addMessageChunk export.aiChatEntry.PageObjectId
describe('the stop control during a chunk stream', () => {
  contractSetup();

  it('takes the send button’s place once a partial_item is cancellable, until final_response', async () => {
    const chat = await openChat();
    await waitFor(() => expect(sendControlShown()).toBe(true));
    const { sent } = await startSend(chat.sender, 'hello');
    expect(sendControlShown()).toBe(true);
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: false })
    );
    expect(sendControlShown()).toBe(true);
    await addChunk(
      chat.instance,
      partialText('r1', 'a', ' there', { cancellable: true })
    );
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await addChunk(
      chat.instance,
      finalChunk('r1', [textItem('Hello there', 'a')], {
        request_id: sent.request.id,
      })
    );
    await waitFor(() => expect(sendControlShown()).toBe(true));
  });

  it('gives the send button back at a stopped complete_item', async () => {
    const chat = await openChat();
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await addChunk(
      chat.instance,
      completeText('r1', 'a', 'Hello', { stream_stopped: true })
    );
    await waitFor(() => expect(sendControlShown()).toBe(true));
    // The response is still open until its final_response.
    expect(chat.instance.getState().status).toBe('streaming');
  });

  it('gives the send button back when the send fails mid-stream', async () => {
    const chat = await openChat({ onError: ignore });
    const { sent, done } = await startSend(chat.sender, 'hello');
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await act(async () => {
      sent.reject('backend went away');
      await done.catch(ignore);
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
  });

  it('gives the send button back when a restart ends the stream', async () => {
    const chat = await openChat();
    const { done } = await startSend(chat.sender, 'hello');
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await act(async () => {
      await chat.instance.messaging.restartConversation();
      await done;
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
  });
});

// @covers config.messaging.showStopButtonImmediately
describe('showStopButtonImmediately', () => {
  contractSetup();

  it('shows the stop control as soon as customSendMessage is called, until the send settles', async () => {
    const chat = await openChat({
      messaging: { showStopButtonImmediately: true },
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
    const { sent, done } = await startSend(chat.sender, 'hello');
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await act(async () => {
      sent.resolve();
      await done;
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
  });

  it('keeps the send button while a send waits for its first chunk when off', async () => {
    const chat = await openChat({
      messaging: { showStopButtonImmediately: false },
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
    await startSend(chat.sender, 'hello');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(sendControlShown()).toBe(true);
  });
});

// @covers config.input.showStopStreamingButton
describe('showStopStreamingButton', () => {
  contractSetup();

  it('shows the stop control with nothing pending, and hides it when set back to false', async () => {
    const chat = await openChat({ input: { showStopStreamingButton: true } });
    await waitFor(() => expect(stopControlShown()).toBe(true));
    expect(chat.instance.getState().status).toBe('ready');
    await chat.rerender({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: { showStopStreamingButton: false },
    });
    await waitFor(() => expect(sendControlShown()).toBe(true));
    await chat.rerender({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: { showStopStreamingButton: true },
    });
    await waitFor(() => expect(stopControlShown()).toBe(true));
  });

  it('keeps the stop control through a restart', async () => {
    const chat = await openChat({ input: { showStopStreamingButton: true } });
    await waitFor(() => expect(stopControlShown()).toBe(true));
    await act(() => chat.instance.messaging.restartConversation());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(stopControlShown()).toBe(true);
  });
});

// Copy the stop button tests set through `strings`, so they find the button by
// an accessible name they own (plan D4.2). The button still has no public test
// ID (MAIN-NOTES M23).
const STOP_STRINGS = {
  input_stopResponse: 'Contract stop',
  messages_requestCancelled: 'Contract request cancelled',
  messages_responseStopped: 'Contract response stopped',
};

/** The stop button, found by its role and the name the test set. */
const stopButton = () => byRole('button', STOP_STRINGS.input_stopResponse);

/** How many stop buttons show: 0 or 1. */
const stopButtonCount = () =>
  allByRole('button', STOP_STRINGS.input_stopResponse).length;

/** The text items of one stored message, from the instance's state. */
function storedTexts(
  instance: { getState(): { messages: readonly unknown[] } },
  id: string
): string[] | undefined {
  const message = instance
    .getState()
    .messages.find((value) => (value as MessageResponse).id === id);
  return message ? outputTexts(message as MessageResponse) : undefined;
}

/**
 * Opens a chat with the stop strings, sends "hello", and streams a
 * cancellable "Hello" into response `r1`, so the stop button shows.
 */
async function streamingChat(config: Partial<PublicConfig> = {}) {
  const chat = await openChat({ ...config, strings: STOP_STRINGS });
  const started = await startSend(chat.sender, 'hello');
  await addChunk(
    chat.instance,
    partialText('r1', 'a', 'Hello', { cancellable: true })
  );
  await waitFor(() => expect(stopButtonCount()).toBe(1));
  return { ...chat, started };
}

// @covers event.stopStreaming export.aiChatEntry.CancellationReason config.strings
// @covers config.messaging.customSendMessage state.messages state.status
describe('the stop button', () => {
  contractSetup();

  it('fires stopStreaming once with only its type, and aborts the send with STOP_STREAMING', async () => {
    const chat = await streamingChat();
    const events = recordEvents(chat.instance, [BusEventType.STOP_STREAMING]);
    await click(stopButton());
    expect(events.events).toEqual([{ type: BusEventType.STOP_STREAMING }]);
    const { signal } = chat.started.sent.options;
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.STOP_STREAMING);
    // On `main` the send resolves, not rejects, once its request is stopped.
    await expect(chat.started.done).resolves.toBeUndefined();
  });

  it('keeps the streamed text, ends the turn, and gives the send button back', async () => {
    const chat = await streamingChat();
    await click(stopButton());
    await act(() => chat.started.done);
    expect(
      chat.instance.getState().messages.map((message) => message.id)
    ).toEqual([chat.started.sent.request.id, 'r1']);
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello']);
    expect(chat.instance.getState().status).toBe('ready');
    await waitFor(() => expect(sendControlShown()).toBe(true));
    expect(stopButtonCount()).toBe(0);
  });

  it('shows the response-stopped notice only once the host sends a complete_item marked stream_stopped', async () => {
    const chat = await streamingChat();
    await click(stopButton());
    await act(() => chat.started.done);
    expect(shownText(document.body)).not.toContain(
      STOP_STRINGS.messages_responseStopped
    );
    await addChunk(
      chat.instance,
      completeText('r1', 'a', 'Hello', { stream_stopped: true })
    );
    await waitFor(() =>
      expect(shownText(document.body)).toContain(
        STOP_STRINGS.messages_responseStopped
      )
    );
  });

  it('keeps the button disabled, and the send running, until a stopStreaming handler settles', async () => {
    const chat = await streamingChat();
    const gate = deferred();
    chat.instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: () => gate.promise,
    });
    await click(stopButton());
    expect(stopButton()).toBeDisabled();
    expect(chat.started.sent.options.signal.aborted).toBe(false);
    await act(async () => {
      gate.resolve();
      await chat.started.done;
    });
    expect(chat.started.sent.options.signal.reason).toBe(
      CancellationReason.STOP_STREAMING
    );
    await waitFor(() => expect(stopButtonCount()).toBe(0));
  });

  it('leaves the stream running, with no onError, and enables the button again when a stopStreaming handler throws', async () => {
    const onError = jest.fn();
    const chat = await streamingChat({ onError });
    chat.instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: () => {
        throw new Error('handler failed');
      },
    });
    await click(stopButton());
    await waitFor(() => expect(stopButton()).toBeEnabled());
    expect(chat.started.sent.options.signal.aborted).toBe(false);
    expect(chat.instance.getState().status).toBe('streaming');
    expect(onError).not.toHaveBeenCalled();
  });

  // @covers config.messaging.showStopButtonImmediately
  it('cancels a send with no response yet, and adds a request-cancelled system message with no receive events', async () => {
    const chat = await openChat({
      strings: STOP_STRINGS,
      messaging: { showStopButtonImmediately: true },
    });
    const started = await startSend(chat.sender, 'hello');
    await waitFor(() => expect(stopButtonCount()).toBe(1));
    const events = recordEvents(chat.instance);
    await click(stopButton());
    await expect(started.done).resolves.toBeUndefined();
    expect(started.sent.options.signal.reason).toBe(
      CancellationReason.STOP_STREAMING
    );
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'stopStreaming',
    ]);
    const [request, notice] = chat.instance.getState().messages;
    expect(request.id).toBe(started.sent.request.id);
    expect(notice).toEqual({
      id: expect.any(String),
      thread_id: 'main',
      history: { timestamp: expect.any(Number) },
      output: {
        generic: [
          {
            response_type: 'system',
            title: STOP_STRINGS.messages_requestCancelled,
          },
        ],
      },
    });
    expect(chat.instance.getState().messages).toHaveLength(2);
    expect(chat.instance.getState().status).toBe('ready');
    await waitFor(() =>
      expect(shownText(document.body)).toContain(
        STOP_STRINGS.messages_requestCancelled
      )
    );
  });

  // @covers config.input.showStopStreamingButton
  it('fires stopStreaming but leaves the send running when only showStopStreamingButton shows it', async () => {
    const chat = await openChat({
      strings: STOP_STRINGS,
      input: { showStopStreamingButton: true },
    });
    const started = await startSend(chat.sender, 'hello');
    const gate = deferred();
    chat.instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: () => gate.promise,
    });
    const events = recordEvents(chat.instance, [BusEventType.STOP_STREAMING]);
    await click(stopButton());
    // Its JSDoc: the button is disabled until the host's handlers return.
    expect(stopButton()).toBeDisabled();
    await act(async () => {
      gate.resolve();
    });
    await waitFor(() => expect(stopButton()).toBeEnabled());
    expect(events.types()).toEqual(['stopStreaming']);
    expect(started.sent.options.signal.aborted).toBe(false);
    expect(chat.instance.getState().status).toBe('submitted');
  });

  it('drops a later partial_item with no request_id, and keeps the button hidden', async () => {
    const chat = await streamingChat();
    await click(stopButton());
    await act(() => chat.started.done);
    await waitFor(() => expect(stopButtonCount()).toBe(0));
    await addChunk(
      chat.instance,
      partialText('r1', 'a', ' more', { cancellable: true })
    );
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello']);
    expect(chat.instance.getState().status).toBe('ready');
    await pause();
    expect(stopButtonCount()).toBe(0);
  });

  it('drops a later partial_item that names the stopped request, and keeps the button hidden', async () => {
    const chat = await streamingChat();
    const requestID = chat.started.sent.request.id;
    await click(stopButton());
    await act(() => chat.started.done);
    const late = partialText('r1', 'a', ' more', { cancellable: true });
    late.streaming_metadata = { response_id: 'r1', request_id: requestID };
    await addChunk(chat.instance, late);
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello']);
    expect(chat.instance.getState().status).toBe('ready');
    await pause();
    expect(stopButtonCount()).toBe(0);
  });

  // @covers instance.messaging.addMessageChunk
  it('still takes the closing complete_item and final_response that name the stopped request', async () => {
    const chat = await streamingChat();
    const requestID = chat.started.sent.request.id;
    await click(stopButton());
    await act(() => chat.started.done);
    const closing = completeText('r1', 'a', 'Hello', { stream_stopped: true });
    closing.streaming_metadata = { response_id: 'r1', request_id: requestID };
    await addChunk(chat.instance, closing);
    await waitFor(() =>
      expect(shownText(document.body)).toContain(
        STOP_STRINGS.messages_responseStopped
      )
    );
    await addChunk(
      chat.instance,
      finalChunk('r1', [textItem('Hello, stopped', 'a')], {
        request_id: requestID,
      })
    );
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello, stopped']);
    expect(chat.instance.getState().status).toBe('ready');
    await pause();
    expect(stopButtonCount()).toBe(0);
  });

  // @covers instance.messaging.addMessageChunk
  it('still takes a later complete_item without stream_stopped that names the stopped request', async () => {
    const chat = await streamingChat();
    const requestID = chat.started.sent.request.id;
    await click(stopButton());
    await act(() => chat.started.done);
    const late = completeText('r1', 'a', 'Hello world');
    late.streaming_metadata = { response_id: 'r1', request_id: requestID };
    await addChunk(chat.instance, late);
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello world']);
  });

  // @covers instance.messaging.addMessageChunk
  it('streams a later request that names itself, and shows the button for it', async () => {
    const chat = await streamingChat();
    await click(stopButton());
    await act(() => chat.started.done);
    await waitFor(() => expect(stopButtonCount()).toBe(0));
    const next = await startSend(chat.sender, 'again');
    const chunk = partialText('r2', 'a', 'Hi', { cancellable: true });
    chunk.streaming_metadata = {
      response_id: 'r2',
      request_id: next.sent.request.id,
    };
    await addChunk(chat.instance, chunk);
    await waitFor(() => expect(stopButtonCount()).toBe(1));
    expect(storedTexts(chat.instance, 'r2')).toEqual(['Hi']);
    expect(chat.instance.getState().status).toBe('streaming');
  });

  // @covers instance.messaging.addMessageChunk
  it('streams a later request with no request_id, and shows the button for it', async () => {
    const chat = await streamingChat();
    await click(stopButton());
    await act(() => chat.started.done);
    await waitFor(() => expect(stopButtonCount()).toBe(0));
    await startSend(chat.sender, 'again');
    await addChunk(
      chat.instance,
      partialText('r2', 'a', 'Hi', { cancellable: true })
    );
    await waitFor(() => expect(stopButtonCount()).toBe(1));
    expect(storedTexts(chat.instance, 'r2')).toEqual(['Hi']);
    expect(chat.instance.getState().status).toBe('streaming');
  });

  // @covers instance.messaging.upsertMessage export.aiChatEntry.MessageState
  it('still updates a response from a STREAMING upsert that names the stopped request, without the button', async () => {
    const chat = await openChat({ strings: STOP_STRINGS });
    const started = await startSend(chat.sender, 'hello');
    const requestID = started.sent.request.id;
    const cancellable = (text: string) =>
      textResponse(text, 'r1', {
        request_id: requestID,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text,
              streaming_metadata: { id: 'a', cancellable: true },
            },
          ],
        },
      });
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.STREAMING, () =>
        cancellable('Hello')
      )
    );
    await waitFor(() => expect(stopButtonCount()).toBe(1));
    await click(stopButton());
    await act(() => started.done);
    await waitFor(() => expect(stopButtonCount()).toBe(0));
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.STREAMING, () =>
        cancellable('Hello more')
      )
    );
    expect(storedTexts(chat.instance, 'r1')).toEqual(['Hello more']);
    expect(chat.instance.getState().status).toBe('ready');
    await pause();
    expect(stopButtonCount()).toBe(0);
  });
});
