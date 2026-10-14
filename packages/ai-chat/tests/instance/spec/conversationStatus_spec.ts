/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ViewType } from '../../../src/types/instance/apiTypes';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { MessageResponse } from '../../../src/types/messaging/Messages';
import { act } from '@testing-library/react';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';

import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

describe('conversation status', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('starts ready and reports hydration until the shared operation finishes', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const lifecycle = serviceManager.conversationLifecycleService;

    expect(instance.getState().status).toBe('ready');

    let generation: number;
    act(() => {
      generation = lifecycle.hydrationStarted();
    });
    expect(instance.getState().status).toBe('loading');

    act(() => lifecycle.hydrationFinished(generation));
    expect(instance.getState().status).toBe('ready');
  });

  it('keeps overlapping responses streaming until every response finishes', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const lifecycle = serviceManager.conversationLifecycleService;

    act(() => {
      lifecycle.requestStarted('request-a');
    });
    expect(instance.getState().status).toBe('submitted');

    act(() => {
      lifecycle.responseStreaming('response-a');
      lifecycle.responseStreaming('response-b');
      lifecycle.requestFinished('request-a');
    });
    expect(instance.getState().status).toBe('streaming');

    act(() => lifecycle.responseFinished('response-a'));
    expect(instance.getState().status).toBe('streaming');

    act(() => lifecycle.responseFinished('response-b'));
    expect(instance.getState().status).toBe('ready');
  });

  it('publishes failure status without freezing the existing callback payload', async () => {
    const onError = jest.fn();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
      });
    const error = {
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'failed',
      otherData: new Error('details'),
    };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => serviceManager.actions.conversationErrorOccurred(error));
    expect(onError).toHaveBeenCalledWith(error);
    expect(onError.mock.calls[0][0]).toBe(error);
    expect(Object.isFrozen(error)).toBe(false);
    expect(Object.isFrozen(error.otherData)).toBe(false);
    expect(instance.state.get().status).toBe('error');
    expect(instance.state.get()).not.toHaveProperty('error');
  });

  it('keeps a rejected welcome send as one message error with its request ID', async () => {
    const onError = jest.fn();
    let welcomeRequestID: string;
    const customSendMessage = jest.fn(async (request) => {
      welcomeRequestID = request.id;
      throw new Error('welcome send failed');
    });
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
        messaging: {
          customLoadHistory: jest.fn().mockResolvedValue([]),
          customSendMessage,
        },
      });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await serviceManager.actions.hydrateChat();

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(instance.state.get().status).toBe('error');
    expect(
      serviceManager.conversationLifecycleService.hasFailureForRequest(
        welcomeRequestID
      )
    ).toBe(true);
    expect(onError.mock.calls[0][0]).not.toHaveProperty('messageID');
    expect(instance.state.get()).not.toHaveProperty('error');
  });

  it('ignores stale completion and errors after restart', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const lifecycle = serviceManager.conversationLifecycleService;
    const staleGeneration = lifecycle.currentGeneration;

    act(() => {
      lifecycle.requestStarted('old-request', staleGeneration);
      lifecycle.restart(true);
      lifecycle.requestStarted('new-request');
      lifecycle.requestFinished('old-request', staleGeneration);
      lifecycle.fail(
        {
          messageID: 'old-request',
        },
        staleGeneration
      );
    });

    expect(instance.getState().status).toBe('submitted');
    expect(instance.getState()).not.toHaveProperty('error');
  });

  it('keeps other responses streaming when an ERROR upsert finishes one response', async () => {
    const onError = jest.fn();
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      onError,
    });

    for (const responseID of ['response-a', 'response-b']) {
      await instance.messaging.upsertMessage(
        responseID,
        MessageState.STREAMING,
        () => ({ id: responseID, output: { generic: [] } })
      );
    }
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.ERROR,
      () => ({ id: 'response-a', output: { generic: [] } })
    );
    expect(instance.getState().status).toBe('streaming');

    await instance.messaging.upsertMessage(
      'response-b',
      MessageState.ERROR,
      () => ({ id: 'response-b', output: { generic: [] } })
    );
    expect(instance.getState().status).toBe('ready');
    expect(instance.getState()).not.toHaveProperty('error');
    expect(onError).not.toHaveBeenCalled();
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
    const { instance } = await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('{}');
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
    const { instance } = await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('{}');
    consoleError.mockRestore();
    await instance.send('second');
    release.doResolve();
    await pendingUpsert;

    expect(instance.state.get().status).toBe('ready');
  });

  it('releases an upsert stream when its send is canceled', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (_request, _options, instance) => {
        await instance.messaging.upsertMessage(
          'response-a',
          MessageState.STREAMING,
          () => ({ id: 'response-a', output: { generic: [] } })
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;
    expect(instance.state.get().status).toBe('streaming');

    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    expect(instance.state.get().status).toBe('ready');
  });

  it('releases both chunk and upsert streams when their send is canceled', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        await instance.messaging.addMessageChunk({
          streaming_metadata: {
            response_id: 'chunk-response',
            request_id: request.id,
          },
          partial_item: {
            response_type: MessageResponseTypes.TEXT,
            text: 'partial',
            streaming_metadata: { id: 'text', cancellable: true },
          },
        });
        await instance.messaging.upsertMessage(
          'upsert-response',
          MessageState.STREAMING,
          () => ({ id: 'upsert-response', output: { generic: [] } })
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;

    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    expect(instance.state.get().status).toBe('ready');
  });

  it.each(['cancel', 'failure'] as const)(
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
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: jest.fn().mockImplementationOnce(() => {
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
        outcome === 'failure' ? expect(send).rejects.toThrow('{}') : send;
      await chunksQueued;
      if (outcome === 'cancel') {
        await serviceManager.messageService.cancelCurrentMessageRequest();
      }
      releaseSend.doResolve();
      await sendSettled;
      await instance.send('next');
      expect(instance.state.get().status).toBe('ready');

      releaseHandler.doResolve();
      await heldChunk;
      await Promise.all(queuedChunks);

      expect(instance.state.get().status).toBe('ready');
      expect(instance.state.get()).not.toHaveProperty('error');
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
    const { instance } = await renderChatAndGetInstanceWithStore(config);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toThrow('{}');
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
    const { instance } = await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await instance.send('first');
    await expect(instance.send('second')).rejects.toThrow('{}');
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

  it.each(['global Stop', 'targeted cancellation'] as const)(
    'reports settled response ownership correctly after %s of a newer send',
    async (scope) => {
      const started = resolvablePromise();
      const release = resolvablePromise();
      let secondRequestID: string;
      let firstSignal: AbortSignal;
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (request, options, instance) => {
          if (request.input.text === 'first') {
            firstSignal = options.signal;
            await instance.messaging.upsertMessage(
              'response-a',
              MessageState.STREAMING,
              () => ({ id: 'response-a', output: { generic: [] } })
            );
          } else {
            secondRequestID = request.id;
            started.doResolve();
            await release;
          }
        },
      };
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.send('first');
      const pendingSend = instance.send('second');
      await started;
      await instance.messaging.upsertMessage(
        'response-a',
        MessageState.STREAMING,
        () => ({ id: 'response-a', output: { generic: [] } })
      );

      if (scope === 'global Stop') {
        await serviceManager.messageService.cancelCurrentMessageRequest();
      } else {
        await serviceManager.messageService.cancelMessageRequestByID(
          secondRequestID,
          false
        );
      }
      release.doResolve();
      await pendingSend;
      const statusAfterCancel = instance.state.get().status;
      expect(firstSignal.aborted).toBe(scope === 'global Stop');
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(scope === 'targeted cancellation');
      expect(
        serviceManager.messageUpsertCoordinator.getState('response-a')
      ).toBe(
        scope === 'global Stop' ? MessageState.ERROR : MessageState.STREAMING
      );
      await instance.messaging.upsertMessage(
        'response-a',
        MessageState.COMPLETE,
        () => ({ id: 'response-a', output: { generic: [] } })
      );

      expect(statusAfterCancel).toBe(
        scope === 'global Stop' ? 'ready' : 'streaming'
      );
      expect(instance.state.get().status).toBe('ready');
    }
  );

  it('updates content without reviving an upsert stream after cancel', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    let requestID: string;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        requestID = request.id;
        await instance.messaging.upsertMessage(
          'response-a',
          MessageState.STREAMING,
          () => ({
            id: 'response-a',
            request_id: requestID,
            output: {
              generic: [
                { response_type: MessageResponseTypes.TEXT, text: 'before' },
              ],
            },
          })
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;
    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.STREAMING,
      () => ({
        id: 'response-a',
        request_id: requestID,
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'after' },
          ],
        },
      })
    );

    expect(
      instance.state
        .get()
        .messages.find((message) => message.id === 'response-a')
    ).toMatchObject({ output: { generic: [{ text: 'after' }] } });
    expect(instance.state.get().status).toBe('ready');
  });
  it.each(['upsert', 'complete upsert', 'chunk', 'final chunk', 'addMessage'])(
    'keeps the pending turn streaming after its %s response completes',
    async (path) => {
      const received = resolvablePromise();
      const release = resolvablePromise();
      let settled = false;
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          const response: MessageResponse = {
            id: 'answer',
            request_id: request.id,
            output: { generic: [] },
          };
          if (path === 'upsert') {
            await chat.messaging.upsertMessage(
              'answer',
              MessageState.STREAMING,
              () => response
            );
          }
          if (path.includes('upsert')) {
            await chat.messaging.upsertMessage(
              'answer',
              MessageState.COMPLETE,
              () => response
            );
          } else if (path === 'addMessage') {
            await chat.messaging.addMessage(response);
          } else {
            if (path === 'chunk') {
              await chat.messaging.addMessageChunk({
                streaming_metadata: {
                  response_id: 'answer',
                  request_id: request.id,
                },
                partial_item: {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'partial',
                  streaming_metadata: { id: 'text' },
                },
              });
            }
            await chat.messaging.addMessageChunk({ final_response: response });
          }
          received.doResolve();
          await release;
        },
      };
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      await serviceManager.actions.hydrateChat();
      const statuses = [instance.state.get().status];
      const unsubscribe = instance.state.select(
        (state) => state.status,
        (status) => statuses.push(status)
      );
      const sending = instance.send('question').then(() => {
        settled = true;
      });
      await received;
      const statusBeforeSettlement = instance.state.get().status;
      const settledBeforeRelease = settled;
      release.doResolve();
      await sending;
      unsubscribe();
      expect(settledBeforeRelease).toBe(false);
      expect(statusBeforeSettlement).toBe('streaming');
      expect(statuses).toEqual(['ready', 'submitted', 'streaming', 'ready']);
    }
  );

  it('does not mark a newer request responded when an older stream updates', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const lifecycle = serviceManager.conversationLifecycleService;
    act(() => {
      lifecycle.requestStarted('first');
      lifecycle.responseStreaming('answer', undefined, 'first');
      lifecycle.requestFinished('first');
      lifecycle.requestStarted('second');
      lifecycle.responseStreaming('answer', undefined, 'second');
      lifecycle.responseFinished('answer');
    });
    expect(instance.state.get().status).toBe('submitted');
  });

  it.each(['chunk', 'upsert'])(
    'keeps late ownerless %s content after Stop without reviving status',
    async (path) => {
      const started = resolvablePromise();
      const release = resolvablePromise();
      const config = createBaseConfig();
      const update = async (chat: ChatInstance, text: string) => {
        if (path === 'upsert') {
          await chat.messaging.upsertMessage(
            'answer',
            MessageState.STREAMING,
            () => ({
              id: 'answer',
              output: {
                generic: [{ response_type: MessageResponseTypes.TEXT, text }],
              },
            })
          );
        } else {
          await chat.messaging.addMessageChunk({
            streaming_metadata: { response_id: 'answer' },
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text,
              streaming_metadata: { id: 'text', cancellable: true },
            },
          });
        }
      };
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (_request, _options, chat) => {
          await update(chat, 'before');
          started.doResolve();
          await release;
        },
      };
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      const sending = instance.send('question');
      await started;
      const statuses: string[] = [];
      const unsubscribe = instance.state.select(
        (state) => state.status,
        (status) => statuses.push(status)
      );
      await serviceManager.messageService.cancelCurrentMessageRequest();
      release.doResolve();
      await sending;
      await update(instance, 'after');
      unsubscribe();
      expect(statuses).toEqual(['ready']);
      expect(instance.state.get().status).toBe('ready');
      expect(JSON.stringify(instance.state.get().messages)).toContain('after');
    }
  );

  it('preserves mutable legacy send-error data without exposing an error snapshot', async () => {
    const onError = jest.fn();
    const failure = new Error('failed');
    const config = createBaseConfig();
    config.onError = onError;
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async () => {
        throw failure;
      },
    };
    const { instance } = await renderChatAndGetInstanceWithStore(config);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(instance.send('question')).rejects.toThrow('{}');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toEqual({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: '{}',
    });
    expect(Object.isFrozen(onError.mock.calls[0][0])).toBe(false);
    expect(Object.isFrozen(failure)).toBe(false);
    expect(instance.state.get()).not.toHaveProperty('error');
    expect(instance.getState()).not.toHaveProperty('error');
    expect(instance.state.get().status).toBe('error');
  });

  it('waits for history loading before executing a send', async () => {
    const loaded = resolvablePromise<any[]>();
    const loading = resolvablePromise();
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const { instance } = await renderChatAndGetInstanceWithStore({
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

  it('reports loading then ready when restarting an open failed conversation', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: { skipWelcome: true },
      });
    await instance.changeView(ViewType.MAIN_WINDOW);
    act(() => serviceManager.conversationLifecycleService.fail({}));
    const statuses: string[] = [];
    const unsubscribe = instance.state.select(
      (state) => state.status,
      (status) => statuses.push(status)
    );
    await instance.restartConversation();
    unsubscribe();
    expect(statuses).toEqual(['loading', 'ready']);
    expect(instance.state.get()).not.toHaveProperty('error');
  });

  it('starts the next send submitted and ignores unrelated completed responses', async () => {
    const started = resolvablePromise();
    const release = resolvablePromise();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: {
          skipWelcome: true,
          customSendMessage: async () => {
            started.doResolve();
            await release;
          },
        },
      });
    await serviceManager.actions.hydrateChat();
    act(() => serviceManager.conversationLifecycleService.fail({}));
    const statuses: string[] = [];
    const unsubscribe = instance.state.select(
      (state) => state.status,
      (status) => statuses.push(status)
    );
    const sending = instance.send('new turn');
    await started;
    await instance.messaging.addMessage({
      id: 'unrelated',
      request_id: 'other-request',
      output: { generic: [] },
    });
    const pendingStatus = instance.state.get().status;
    release.doResolve();
    await sending;
    unsubscribe();
    expect(statuses).toEqual(['submitted', 'ready']);
    expect(pendingStatus).toBe('submitted');
  });

  it('publishes status and each streamed text increment in order', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
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
    const { instance } = await renderChatAndGetInstanceWithStore({
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

  it.each(['addMessage', 'final chunk'])(
    'discards an accepted %s when its status subscriber clears the conversation',
    async (path) => {
      const holdItem = resolvablePromise();
      let cleared: Promise<void>;
      const { instance, serviceManager, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      act(() =>
        serviceManager.conversationLifecycleService.requestStarted('pending')
      );
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: () => holdItem,
      });
      const unsubscribe = instance.state.select(
        (state) => state.status,
        (status) => {
          if (status === 'streaming') {
            cleared = instance.messaging.clearConversation();
          }
        }
      );
      const message: MessageResponse = {
        id: 'old-response',
        request_id: 'pending',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: {},
            },
          ],
        },
      };
      if (path === 'addMessage') {
        await instance.messaging.addMessage(message);
      } else {
        await instance.messaging.addMessageChunk({ final_response: message });
      }
      expect(cleared).toBeDefined();
      await cleared;
      await act(async () => {
        holdItem.doResolve();
      });
      unsubscribe();
      expect(
        Object.values(store.getState().allMessageItemsByID).some(
          (item) => item.fullMessageID === 'old-response'
        )
      ).toBe(false);
      expect(
        instance.state
          .get()
          .messages.some((value) => value.id === 'old-response')
      ).toBe(false);
    }
  );
});
