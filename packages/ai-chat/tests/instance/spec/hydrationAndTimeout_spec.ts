/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { HistoryItem } from '../../../src/types/messaging/History';
import { CancellationReason } from '../../../src/types/config/MessagingConfig';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('hydration and timeout isolation', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('restart during the first history load starts a clean conversation', async () => {
    const history = resolvablePromise<HistoryItem[]>();
    const customLoadHistory = jest.fn(() => history);
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const { instance, serviceManager, store } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: { customLoadHistory, customSendMessage },
      });
    const initialize = jest
      .spyOn(serviceManager.humanAgentService, 'initialize')
      .mockResolvedValue(undefined);
    const opening = instance.changeView({ mainWindow: true, launcher: false });
    await waitFor(() => expect(customLoadHistory).toHaveBeenCalledTimes(1));
    const generation =
      serviceManager.conversationLifecycleService.currentGeneration;
    const restart = instance.messaging.restartConversation();
    await waitFor(() =>
      expect(
        serviceManager.conversationLifecycleService.currentGeneration
      ).toBeGreaterThan(generation)
    );
    await act(async () => {
      history.doResolve([
        {
          message: { id: 'old-history', output: { generic: [] } },
          time: new Date().toISOString(),
        },
      ]);
      await opening;
      await restart;
    });
    expect(customLoadHistory).toHaveBeenCalledTimes(1);
    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(store.getState().allMessagesByID['old-history']).toBeUndefined();
    expect(instance.state.get().status).toBe('ready');
  });

  it('preserves the history failure path without welcome or agent initialization', async () => {
    const failure = new Error('history unavailable');
    const onError = jest.fn();
    const customSendMessage = jest.fn();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
        messaging: {
          customLoadHistory: jest.fn().mockRejectedValue(failure),
          customSendMessage,
        },
      });
    const initialize = jest.spyOn(
      serviceManager.humanAgentService,
      'initialize'
    );
    const reconnect = jest.spyOn(
      serviceManager.humanAgentService,
      'handleHydration'
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => serviceManager.actions.hydrateChat());
    expect(customSendMessage).not.toHaveBeenCalled();
    expect(initialize).not.toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: OnErrorType.HYDRATION,
        otherData: failure,
      })
    );
    expect(instance.state.get().status).toBe('error');
  });

  it.each(['resolve', 'reject'])(
    'keeps the timeout outcome when the sender %ss on abort',
    async (settlement) => {
      const nextSender = resolvablePromise<void>();
      const onError = jest.fn();
      const customSendMessage = jest
        .fn()
        .mockImplementationOnce(
          (_request, options) =>
            new Promise<void>((resolve, reject) => {
              options.signal.addEventListener('abort', () =>
                settlement === 'resolve'
                  ? resolve()
                  : reject(new Error('host aborted'))
              );
            })
        )
        .mockImplementationOnce(() => nextSender);
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          onError,
          messaging: {
            customSendMessage,
            messageTimeoutSecs: 1,
            skipWelcome: true,
          },
        });
      let timeout: () => void;
      jest
        .spyOn(serviceManager.messageService.messageLoadingManager, 'start')
        .mockImplementation((_message, _options, onTimeout) => {
          timeout = onTimeout;
        });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const first = instance.send('first');
      const outcome = first.then(
        (): Error | undefined => undefined,
        (error: Error) => error
      );
      await waitFor(() => expect(customSendMessage).toHaveBeenCalledTimes(1));
      const next = instance.send('next');
      const queue = (
        serviceManager.messageService as unknown as {
          queue: {
            waiting: unknown[];
            current: { sendMessagePromise: { isRejected: boolean } };
          };
        }
      ).queue;
      await waitFor(() => expect(queue.waiting).toHaveLength(1));
      const timedOutRequest = queue.current;
      await act(async () => {
        timeout();
        expect(timedOutRequest.sendMessagePromise.isRejected).toBe(true);
        expect(onError).not.toHaveBeenCalled();
      });
      expect(await outcome).toEqual(
        expect.objectContaining({ message: CancellationReason.TIMEOUT })
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: CancellationReason.TIMEOUT,
        otherData: undefined,
      });
      expect(Object.isFrozen(onError.mock.calls[0][0])).toBe(false);
      await waitFor(() => expect(customSendMessage).toHaveBeenCalledTimes(2));
      expect(instance.state.get().status).toBe('submitted');
      await act(async () => {
        nextSender.doResolve();
        await next;
      });
    }
  );
});
