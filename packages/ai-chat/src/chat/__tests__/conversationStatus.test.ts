/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessageResponse } from '../../types/messaging/Messages';

import { resolvablePromise } from '../../sdk/utils/resolvablePromise';
import { MessageResponseTypes } from '../../types/messaging/Messages';

import { OnErrorType } from '../../types/config/ErrorConfig';
import { MessageState } from '../../types/config/MessagingConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import {
  createBaseConfig,
  bootChat,
  shutdownBootedChats,
  setupAfterEach,
  setupBeforeEach,
} from './helpers/chat';

describe('conversation status', () => {
  beforeEach(setupBeforeEach);
  afterEach(async () => {
    await shutdownBootedChats();
    setupAfterEach();
  });

  it('releases an awaited upsert stream when its send throws', async () => {
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          await instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            () => ({ id: 'response-a', output: { generic: [] } })
          );
          throw new Error('send failed');
        }
        await instance.messaging.upsertMessage(
          'response-b',
          MessageState.COMPLETE,
          () => ({ id: 'response-b', output: { generic: [] } })
        );
      },
    };
    const { instance } = await bootChat(config);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('send failed');
    consoleError.mockRestore();
    await instance.send('second');

    expect(instance.state.get().status).toBe('ready');
  });

  it('releases an unawaited upsert that lands after its send throws', async () => {
    const release = resolvablePromise();
    let pendingUpsert: Promise<void>;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          pendingUpsert = instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            async () => {
              await release;
              return { id: 'response-a', output: { generic: [] } };
            }
          );
          throw new Error('send failed');
        }
        await instance.messaging.upsertMessage(
          'response-b',
          MessageState.COMPLETE,
          () => ({ id: 'response-b', output: { generic: [] } })
        );
      },
    };
    const { instance } = await bootChat(config);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('send failed');
    consoleError.mockRestore();
    await instance.send('second');
    release.doResolve();
    await pendingUpsert;

    expect(instance.state.get().status).toBe('ready');
  });

  it.each<'cancel' | 'failure'>(['failure'])(
    'does not revive queued chunk responses after request %s',
    async (outcome) => {
      const handlerStarted = resolvablePromise();
      const releaseHandler = resolvablePromise();
      const chunksQueued = resolvablePromise();
      const releaseSend = resolvablePromise();
      let queuedChunks: Promise<void>[];
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          if (request.input.text === 'next') {
            return;
          }
          queuedChunks = [true, false].map((explicitOwner) =>
            chat.messaging.addMessageChunk({
              streaming_metadata: {
                response_id: explicitOwner
                  ? 'explicit-response'
                  : 'implicit-response',
                ...(explicitOwner ? { request_id: request.id } : {}),
              },
              partial_item: {
                response_type: MessageResponseTypes.TEXT,
                text: 'queued content',
                streaming_metadata: { id: 'text' },
              },
            })
          );
          chunksQueued.doResolve();
          await releaseSend;
          if (outcome === 'failure') {
            throw new Error('send failed');
          }
        },
      };
      const { instance, serviceManager } = await bootChat(config);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: vi.fn().mockImplementationOnce(() => {
          handlerStarted.doResolve();
          return releaseHandler;
        }),
      });
      const heldChunk = instance.messaging.addMessageChunk({
        final_response: { id: 'held-response', output: { generic: [] } },
      });
      await handlerStarted;
      const send = instance.send('first');
      const sendSettled =
        outcome === 'failure'
          ? expect(send).rejects.toThrow('send failed')
          : send;
      await chunksQueued;
      if (outcome === 'cancel') {
        await serviceManager.messageCoordinator.cancelCurrentMessageRequest();
      }
      releaseSend.doResolve();
      await sendSettled;
      await instance.send('next');
      expect(instance.state.get().status).toBe('ready');

      releaseHandler.doResolve();
      await heldChunk;
      await Promise.all(queuedChunks);

      expect(instance.state.get().status).toBe('ready');
      expect(instance.state.get().error).toBeNull();
      expect(
        instance.state.get().messages.map((message) => message.id)
      ).toEqual(
        expect.arrayContaining(['explicit-response', 'implicit-response'])
      );
    }
  );

  it('releases chunk responses when their send fails', async () => {
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, chat) => {
        if (request.input.text === 'next') {
          return;
        }
        for (const responseID of ['response-a', 'response-b']) {
          await chat.messaging.addMessageChunk({
            streaming_metadata: { response_id: responseID },
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: 'partial',
              streaming_metadata: { id: 'text' },
            },
          });
        }
        throw new Error('send failed');
      },
    };
    const { instance } = await bootChat(config);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('send failed');
    expect(instance.state.get().status).toBe('error');
    await instance.send('next');

    expect(instance.state.get().status).toBe('ready');
  });

  it('keeps a settled request stream alive when another send fails', async () => {
    const started = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          await instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            () => ({ id: 'response-a', output: { generic: [] } })
          );
        } else if (request.input.text === 'second') {
          throw new Error('send failed');
        } else {
          started.doResolve();
          await release;
          await instance.messaging.upsertMessage(
            'response-c',
            MessageState.COMPLETE,
            () => ({ id: 'response-c', output: { generic: [] } })
          );
        }
      },
    };
    const { instance } = await bootChat(config);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await instance.send('first');
    await expect(instance.send('second')).rejects.toThrow('send failed');
    consoleError.mockRestore();
    const pendingSend = instance.send('third');
    await started;
    const statusWhilePending = instance.state.get().status;
    release.doResolve();
    await pendingSend;
    const statusAfterSend = instance.state.get().status;
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.COMPLETE,
      () => ({ id: 'response-a', output: { generic: [] } })
    );

    expect(statusWhilePending).toBe('streaming');
    expect(statusAfterSend).toBe('streaming');
    expect(instance.state.get().status).toBe('ready');
  });

  it('preserves mutable legacy send-error data and exposes a frozen copy as state.error', async () => {
    const onError = vi.fn();
    const failure = new Error('failed');
    const config = createBaseConfig();
    config.onError = onError;
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async () => {
        throw failure;
      },
    };
    const { instance } = await bootChat(config);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(instance.send('question')).rejects.toThrow('failed');
    expect(onError).toHaveBeenCalledTimes(1);
    const requestID = instance.state.get().messages[0].id;
    expect(onError.mock.calls[0][0]).toEqual({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: 'failed',
      messageID: requestID,
    });
    expect(Object.isFrozen(onError.mock.calls[0][0])).toBe(false);
    expect(Object.isFrozen(failure)).toBe(false);
    expect(instance.state.get().error).toEqual(onError.mock.calls[0][0]);
    expect(Object.isFrozen(instance.state.get().error)).toBe(true);
    expect(instance.getState().error).toBe(instance.state.get().error);
    expect(instance.state.get().status).toBe('error');
  });

  it('waits for history loading before executing a send', async () => {
    const loaded = resolvablePromise<any[]>();
    const loading = resolvablePromise();
    const customSendMessage = vi.fn().mockResolvedValue(undefined);
    const { instance } = await bootChat({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage,
        customLoadHistory: () => {
          loading.doResolve();
          return loaded;
        },
      },
    });
    const sending = instance.send('queued during loading');
    await loading;
    expect(instance.state.get().status).toBe('loading');
    expect(customSendMessage).not.toHaveBeenCalled();
    loaded.doResolve([]);
    await sending;
    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(instance.state.get().status).toBe('ready');
  });

  it('publishes status and each streamed text increment in order', async () => {
    const { instance, serviceManager } = await bootChat({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          for (const text of ['one', 'two']) {
            await chat.messaging.addMessageChunk({
              streaming_metadata: {
                response_id: 'increments',
                request_id: request.id,
              },
              partial_item: {
                response_type: MessageResponseTypes.TEXT,
                text,
                streaming_metadata: { id: 'text' },
              },
            });
          }
          await chat.messaging.addMessageChunk({
            final_response: {
              id: 'increments',
              request_id: request.id,
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.TEXT,
                    text: 'onetwo',
                  },
                ],
              },
            },
          });
        },
      },
    });
    await serviceManager.actions.hydrateChat();
    const seen: string[] = [];
    const unsubscribe = instance.state.subscribe(() => {
      const state = instance.state.get();
      const message = state.messages.find(
        (value) => value.id === 'increments'
      ) as MessageResponse;
      const text = (message?.output.generic[0] as any)?.text ?? '';
      const value = state.status + ':' + text;
      if (seen[seen.length - 1] !== value) {
        seen.push(value);
      }
    });
    await instance.send('stream');
    unsubscribe();
    expect(seen.indexOf('submitted:')).toBeGreaterThanOrEqual(0);
    expect(seen.indexOf('streaming:one')).toBeGreaterThan(
      seen.indexOf('submitted:')
    );
    expect(seen.indexOf('streaming:onetwo')).toBeGreaterThan(
      seen.indexOf('streaming:one')
    );
    expect(seen[seen.length - 1]).toBe('ready:onetwo');
  });
  it('keeps completed response ownership when a later send is pending', async () => {
    const started = resolvablePromise();
    const release = resolvablePromise();
    const { instance } = await bootChat({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          if (request.input.text === 'first') {
            await chat.messaging.upsertMessage(
              'completed',
              MessageState.COMPLETE,
              () => ({ id: 'completed', output: { generic: [] } })
            );
          } else {
            started.doResolve();
            await release;
          }
        },
      },
    });
    await instance.send('first');
    const sending = instance.send('second');
    await started;
    await instance.messaging.upsertMessage(
      'completed',
      MessageState.COMPLETE,
      () => ({ id: 'completed', output: { generic: [] } })
    );
    const status = instance.state.get().status;
    release.doResolve();
    await sending;
    expect(status).toBe('submitted');
  });
});
