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
  OnErrorType,
  PageObjectId,
  PublicConfig,
} from '../../../../src/aiChatEntry';
import {
  SEND_ERROR_MESSAGE,
  addChunk,
  byTestId,
  completeText,
  contractChat,
  contractSetup,
  describeShared,
  fakeBackend,
  finalChunk,
  instanceSender,
  partialText,
  partialUserDefined,
  startSend,
  textItem,
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
