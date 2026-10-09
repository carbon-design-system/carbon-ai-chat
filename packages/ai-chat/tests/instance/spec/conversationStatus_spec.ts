/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
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

  it('publishes the exact frozen error before calling onError', async () => {
    let callbackState: ReturnType<
      Awaited<
        ReturnType<typeof renderChatAndGetInstanceWithStore>
      >['instance']['getState']
    >;
    const onError = jest.fn((error) => {
      callbackState = instance.getState();
      expect(callbackState.error).toBe(error);
      expect(callbackState.status).toBe('error');
    });
    const config = { ...createBaseConfig(), onError };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);

    let publicError: unknown;
    act(() => {
      publicError = serviceManager.actions.conversationErrorOccurred({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: 'send failed',
        messageID: 'request-a',
      });
    });

    expect(onError).toHaveBeenCalledWith(publicError);
    expect(instance.getState().error).toBe(publicError);
    expect(Object.isFrozen(publicError)).toBe(true);
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
    expect(instance.state.get().error).toMatchObject({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      messageID: welcomeRequestID,
    });
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
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: 'old failure',
          messageID: 'old-request',
        },
        staleGeneration
      );
    });

    expect(instance.getState().status).toBe('submitted');
    expect(instance.getState().error).toBeNull();
  });

  it('treats an ERROR upsert as terminal without reporting a global error', async () => {
    const onError = jest.fn();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
      });

    act(() => {
      serviceManager.conversationLifecycleService.responseStreaming(
        'standalone-response'
      );
    });
    await instance.messaging.upsertMessage(
      'standalone-response',
      MessageState.ERROR,
      () => ({
        id: 'standalone-response',
        output: { generic: [] },
      })
    );

    expect(instance.getState().status).toBe('ready');
    expect(instance.getState().error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
