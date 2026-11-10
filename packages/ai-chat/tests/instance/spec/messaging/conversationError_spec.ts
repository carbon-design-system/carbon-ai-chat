/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `state.error`: every failure that sets `status: 'error'` sets it, with the same fields
 * `onError` gets, and it clears with `status`.
 */

import { act, waitFor } from '@testing-library/react';
import { UPSERT_MESSAGE } from '../../../../src/shared/store/actions';
import type { MessageWriteOptions } from '../../../../src/shared/store/messageWriteTypes';
import type { ServiceManager } from '../../../../src/shared/services/ServiceManager';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../../src/types/config/ServiceDeskConfig';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  UserType,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

function requestIDs(instance: ChatInstance) {
  return instance.state
    .get()
    .messages.filter((message) => 'input' in message)
    .map((message) => message.id);
}

describe('state.error', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('holds a failed history load, with no messageID, and only its outer object frozen', async () => {
    const failure = new Error('history unavailable');
    const onError = jest.fn();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
        messaging: { customLoadHistory: jest.fn().mockRejectedValue(failure) },
      });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => serviceManager.actions.hydrateChat());

    const { error, status } = instance.state.get();
    expect(status).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(error).toEqual(onError.mock.calls[0][0]);
    expect(error).not.toHaveProperty('messageID');
    expect(Object.isFrozen(error)).toBe(true);
    expect(error.otherData).toBe(failure);
    expect(Object.isFrozen(failure)).toBe(false);
  });

  it('holds a failed send with its request ID, and the next send clears it', async () => {
    const onError = jest.fn();
    const customSendMessage = jest
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(undefined);
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      onError,
      messaging: { skipWelcome: true, customSendMessage },
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toBeDefined();
    const [requestID] = requestIDs(instance);
    expect(instance.state.get().error).toEqual({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: expect.any(String),
      messageID: requestID,
    });
    expect(instance.state.get().error).toEqual(onError.mock.calls[0][0]);

    const statuses: string[] = [];
    const errors: unknown[] = [];
    const stop = instance.state.subscribe(() => {
      statuses.push(instance.state.get().status);
      errors.push(instance.state.get().error);
    });
    await instance.send('second');
    stop();
    // The error clears in the same publication that leaves 'error'.
    expect(errors[statuses.findIndex((status) => status !== 'error')]).toBe(
      null
    );
    expect(instance.state.get().error).toBeNull();
  });

  it('holds a streamed response the chat could not process, naming its request', async () => {
    const processingFailure = new Error('stream reducer failed');
    const onError = jest.fn();
    const { instance, store } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      onError,
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          await chat.messaging.addMessageChunk({
            streaming_metadata: { response_id: 'failed-response' },
            partial_item: {
              streaming_metadata: { id: 'failed-item' },
              response_type: MessageResponseTypes.TEXT,
              text: 'partial',
            },
          });
        },
      },
    });
    const originalDispatch = store.dispatch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(store, 'dispatch').mockImplementation((action) => {
      if (
        action.type === UPSERT_MESSAGE &&
        (action.options as MessageWriteOptions | undefined)?.origin === 'chunk'
      ) {
        throw processingFailure;
      }
      return originalDispatch(action);
    });

    await expect(instance.send('trigger')).rejects.toThrow(
      'stream reducer failed'
    );

    const [requestID] = requestIDs(instance);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(instance.state.get().error).toEqual({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'The chat could not process a streamed response.',
      otherData: processingFailure,
      messageID: requestID,
    });
    expect(instance.state.get().error.otherData).toBe(processingFailure);
  });

  it('clears on restart', async () => {
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: jest.fn().mockRejectedValue(new Error('down')),
      },
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(instance.send('first')).rejects.toBeDefined();
    expect(instance.state.get().error).not.toBeNull();

    await instance.messaging.restartConversation();

    expect(instance.state.get().status).toBe('ready');
    expect(instance.state.get().error).toBeNull();
  });

  it("holds a human agent's send timeout, which onError doesn't get", async () => {
    try {
      let callback: ServiceDeskCallback;
      const desk = {
        getName: () => 'Test desk',
        startChat: jest.fn(async () => {}),
        endChat: jest.fn(async () => {}),
        // The desk never confirms the send.
        sendMessageToAgent: jest.fn(() => new Promise<void>(() => {})),
      };
      const onError = jest.fn();
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          onError,
          messaging: { skipWelcome: true },
          serviceDeskFactory: async (parameters) => {
            callback = parameters.callback;
            return desk as unknown as ServiceDesk;
          },
        });
      const agentService = (
        serviceManager.messageCoordinator as unknown as {
          serviceManager: ServiceManager;
        }
      ).serviceManager.humanAgentService as unknown as {
        chatStarted: boolean;
        sendMessageToAgent(text: string, files: unknown[]): Promise<void>;
      };
      void instance.changeView(ViewType.MAIN_WINDOW);
      await waitFor(() => expect(callback).toBeDefined());
      await waitFor(() => expect(store.getState().isHydrated).toBe(true));
      agentService.chatStarted = true;
      await callback.agentJoined({
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      });

      jest.useFakeTimers();
      void agentService.sendMessageToAgent('hello', []);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(desk.sendMessageToAgent).toHaveBeenCalled();
      const [request] = desk.sendMessageToAgent.mock.calls[0] as unknown as [
        { id: string },
      ];
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });

      expect(instance.state.get().status).toBe('error');
      expect(instance.state.get().error).toEqual({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message:
          'The service desk did not confirm that the message was sent, so the chat marked it failed.',
        messageID: request.id,
      });
      expect(onError).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
