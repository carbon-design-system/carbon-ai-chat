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
  ChatInstanceMessaging,
  CompleteItemChunk,
  FinalResponseChunk,
  GenericItem,
  ItemStreamingMetadata,
  MessageErrorState,
  MessageResponse,
  MessageResponseTypes,
  OnErrorType,
  PageObjectId,
  PartialItemChunk,
  PublicConfig,
  StreamChunk,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  byTestId,
  contractChat,
  contractCleanup,
  describeShared,
  fakeBackend,
  finishSend,
  outputTexts,
  startSend,
} from '../../helpers';

/** A text `partial_item` chunk. Leave `itemID` out for an item with no ID. */
function partialText(
  responseID: string,
  itemID: string | undefined,
  text: string,
  metadata: Partial<ItemStreamingMetadata> = {}
): PartialItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text,
      ...(itemID ? { streaming_metadata: { id: itemID, ...metadata } } : {}),
    },
  };
}

/** A text `complete_item` chunk. */
function completeText(
  responseID: string,
  itemID: string,
  text: string,
  metadata: Partial<ItemStreamingMetadata> = {}
): CompleteItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    complete_item: {
      response_type: MessageResponseTypes.TEXT,
      text,
      streaming_metadata: { id: itemID, ...metadata },
    },
  };
}

/** A `final_response` chunk with these items. */
function finalChunk(
  responseID: string,
  generic: GenericItem[],
  extra: Partial<MessageResponse> = {}
): FinalResponseChunk {
  return { final_response: { id: responseID, output: { generic }, ...extra } };
}

/** A text item, with a streaming ID when `itemID` is given. */
function textItem(text: string, itemID?: string): GenericItem {
  return {
    response_type: MessageResponseTypes.TEXT,
    text,
    ...(itemID ? { streaming_metadata: { id: itemID } } : {}),
  } as GenericItem;
}

/** A user_defined item, with a streaming ID. */
function userDefinedItem(
  itemID: string,
  userDefined: Record<string, unknown>
): GenericItem {
  return {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: userDefined,
    streaming_metadata: { id: itemID },
  } as GenericItem;
}

/** A user_defined `partial_item` chunk. */
function partialUserDefined(
  responseID: string,
  itemID: string,
  userDefined: Record<string, unknown>
): PartialItemChunk {
  return {
    streaming_metadata: { response_id: responseID },
    partial_item: userDefinedItem(itemID, userDefined),
  };
}

/** Swallows a value: an expected rejection, or an `onError` call. */
const ignore = (): void => undefined;

async function addChunk(
  chat: { messaging: ChatInstanceMessaging },
  chunk: StreamChunk
) {
  await act(async () => {
    await chat.messaging.addMessageChunk(chunk);
  });
}

/** The text items of one message in state, or `undefined` if it isn't there. */
function textsOf(chat: ContractDriver, messageID: string) {
  const message = chat.messages().find((value) => value.id === messageID);
  return message ? outputTexts(message as MessageResponse) : undefined;
}

// @covers instance.messaging.addMessageChunk event.chunk:userDefinedResponse config.onError state.status
// @covers export.aiChatEntry.OnErrorType export.aiChatEntry.MessageErrorState
describeShared('errors during a stream', (makeDriver) => {
  afterEach(contractCleanup);

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
      message: 'An error occurred sending a message',
      otherData: 'handler failed',
    });
    expect(chat.status()).toBe('error');
  });

  it('reports a customSendMessage rejection mid-stream and keeps the streamed text', async () => {
    const onError = jest.fn();
    const chat = await makeDriver({ onError });
    const started = await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello, '));
    await addChunk(chat, partialText('r1', 'a', 'world'));
    let sendError: unknown;
    await act(async () => {
      started.sent.reject(new Error('backend went away'));
      await started.done.catch((error) => {
        sendError = error;
      });
    });
    // On `main` an Error from customSendMessage is JSON-stringified, so its
    // message is lost: `send` rejects with Error('{}') and `otherData` is
    // '{}', though OnErrorData.otherData says it may be a stack trace.
    expect(sendError).toEqual(new Error('{}'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: '{}',
    });
    expect(chat.status()).toBe('error');
    const [request] = chat.messages();
    expect(request.history?.error_state).toBe(MessageErrorState.FAILED);
    expect(textsOf(chat, 'r1')).toEqual(['Hello, world']);
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

  it('goes from error to submitted, then ready, on the next send', async () => {
    const chat = await makeDriver({ onError: ignore });
    const failed = await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello'));
    await act(async () => {
      failed.sent.reject('backend went away');
      await failed.done.catch(ignore);
    });
    expect(chat.status()).toBe('error');
    const next = await startSend(chat, 'again');
    expect(chat.status()).toBe('submitted');
    await finishSend(next);
    expect(chat.status()).toBe('ready');
  });
});

// @covers export.aiChatEntry.CancellationReason instance.messaging.restartConversation
// @covers instance.messaging.addMessageChunk state.messages state.status
describeShared('a restart during a stream', (makeDriver) => {
  afterEach(contractCleanup);

  it('aborts the send’s signal with CONVERSATION_RESTARTED and resolves the send', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await addChunk(
      chat,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    let outcome = 'pending';
    started.done.then(
      () => {
        outcome = 'resolved';
      },
      () => {
        outcome = 'rejected';
      }
    );
    await act(() => chat.messaging.restartConversation());
    expect(started.sent.options.signal.aborted).toBe(true);
    expect(started.sent.options.signal.reason).toBe(
      CancellationReason.CONVERSATION_RESTARTED
    );
    await act(async () => {
      await started.done;
    });
    expect(outcome).toBe('resolved');
    expect(chat.messages()).toEqual([]);
    expect(chat.status()).toBe('ready');
  });

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

/**
 * Empties browser storage. A chat that opens saves its view there, and the
 * next mount in this file would restore it and send a welcome request.
 */
function clearStorage(): void {
  sessionStorage.clear();
  localStorage.clear();
}

/**
 * The send button. The stop control has no public test ID; it takes the
 * send button's place while it shows (`InputConfig.showStopStreamingButton`),
 * so these tests read it as the send button's absence.
 */
const sendButton = () => byTestId(PageObjectId.INPUT_SEND);

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
  return { ...mount, backend };
}

/** Starts a send from the instance and waits for the backend to get it. */
async function startInstanceSend(
  chat: Awaited<ReturnType<typeof openChat>>,
  text: string
) {
  let done: Promise<void>;
  await act(async () => {
    done = chat.instance.send(text);
  });
  const sent = await chat.backend.next();
  return { sent, done };
}

// @covers instance.messaging.addMessageChunk export.aiChatEntry.PageObjectId
describe('the stop control during a chunk stream', () => {
  afterEach(contractCleanup);
  afterEach(clearStorage);

  it('takes the send button’s place once a partial_item is cancellable, until final_response', async () => {
    const chat = await openChat();
    await waitFor(() => expect(sendButton()).not.toBeNull());
    const { sent } = await startInstanceSend(chat, 'hello');
    expect(sendButton()).not.toBeNull();
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: false })
    );
    expect(sendButton()).not.toBeNull();
    await addChunk(
      chat.instance,
      partialText('r1', 'a', ' there', { cancellable: true })
    );
    await waitFor(() => expect(sendButton()).toBeNull());
    await addChunk(
      chat.instance,
      finalChunk('r1', [textItem('Hello there', 'a')], {
        request_id: sent.request.id,
      })
    );
    await waitFor(() => expect(sendButton()).not.toBeNull());
  });

  it('gives the send button back at a stopped complete_item', async () => {
    const chat = await openChat();
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(sendButton()).toBeNull());
    await addChunk(
      chat.instance,
      completeText('r1', 'a', 'Hello', { stream_stopped: true })
    );
    await waitFor(() => expect(sendButton()).not.toBeNull());
    // The response is still open until its final_response.
    expect(chat.instance.getState().status).toBe('streaming');
  });

  it('gives the send button back when the send fails mid-stream', async () => {
    const chat = await openChat({ onError: ignore });
    const { sent, done } = await startInstanceSend(chat, 'hello');
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(sendButton()).toBeNull());
    await act(async () => {
      sent.reject('backend went away');
      await done.catch(ignore);
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
  });

  it('gives the send button back when a restart ends the stream', async () => {
    const chat = await openChat();
    const { done } = await startInstanceSend(chat, 'hello');
    await addChunk(
      chat.instance,
      partialText('r1', 'a', 'Hello', { cancellable: true })
    );
    await waitFor(() => expect(sendButton()).toBeNull());
    await act(async () => {
      await chat.instance.messaging.restartConversation();
      await done;
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
  });
});

// @covers config.messaging.showStopButtonImmediately export.aiChatEntry.PageObjectId
describe('showStopButtonImmediately', () => {
  afterEach(contractCleanup);
  afterEach(clearStorage);

  it('shows the stop control as soon as customSendMessage is called, until the send settles', async () => {
    const chat = await openChat({
      messaging: { showStopButtonImmediately: true },
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
    const { sent, done } = await startInstanceSend(chat, 'hello');
    await waitFor(() => expect(sendButton()).toBeNull());
    await act(async () => {
      sent.resolve();
      await done;
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
  });

  it('keeps the send button while a send waits for its first chunk when off', async () => {
    const chat = await openChat({
      messaging: { showStopButtonImmediately: false },
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
    await startInstanceSend(chat, 'hello');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(sendButton()).not.toBeNull();
  });
});

// @covers config.input.showStopStreamingButton export.aiChatEntry.PageObjectId
describe('showStopStreamingButton', () => {
  afterEach(contractCleanup);
  afterEach(clearStorage);

  it('shows the stop control with nothing pending, and hides it when set back to false', async () => {
    const chat = await openChat({ input: { showStopStreamingButton: true } });
    await waitFor(() => expect(sendButton()).toBeNull());
    expect(chat.instance.getState().status).toBe('ready');
    await chat.rerender({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: { showStopStreamingButton: false },
    });
    await waitFor(() => expect(sendButton()).not.toBeNull());
    await chat.rerender({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      input: { showStopStreamingButton: true },
    });
    await waitFor(() => expect(sendButton()).toBeNull());
  });

  it('keeps the stop control through a restart', async () => {
    const chat = await openChat({ input: { showStopStreamingButton: true } });
    await waitFor(() => expect(sendButton()).toBeNull());
    await act(() => chat.instance.messaging.restartConversation());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(sendButton()).toBeNull();
  });
});
