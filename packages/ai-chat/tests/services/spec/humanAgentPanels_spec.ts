/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import createHumanAgentService from '../../../src/chat/services/haa/HumanAgentServiceImpl';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { humanAgentReducers } from '../../../src/chat/store/humanAgentReducers';
import {
  ScreenShareState,
  ServiceDeskCallback,
  ServiceDeskFactoryParameters,
} from '../../../src/types/config/ServiceDeskConfig';
import { HumanAgentMessageType } from '../../../src/types/messaging/Messages';
import { AppState } from '../../../src/types/state/AppState';

async function createFixture(isConnected = true) {
  let callback: ServiceDeskCallback<unknown>;
  let state = {
    config: {
      public: {
        serviceDeskFactory: ({
          callback: serviceCallback,
        }: ServiceDeskFactoryParameters) => {
          callback = serviceCallback;
          return {
            getName: () => 'Test desk',
            startChat: jest.fn(),
            endChat: jest.fn(),
            sendMessageToAgent: jest.fn(),
          };
        },
      },
    },
    humanAgentState: { isScreenSharing: false, showScreenShareRequest: false },
    persistedToBrowserStorage: { humanAgentState: { isConnected } },
  } as unknown as AppState;
  const manager = {
    store: {
      getState: () => state,
      dispatch: jest.fn((action) => {
        state = humanAgentReducers[action.type](state, action);
      }),
    },
  } as unknown as ServiceManager;
  const service = createHumanAgentService(manager);
  const addMessage = jest
    .spyOn(
      service as typeof service & {
        addHumanAgentLocalMessage(type: HumanAgentMessageType): Promise<void>;
      },
      'addHumanAgentLocalMessage'
    )
    .mockResolvedValue(undefined);
  await service.initialize();
  return { service, callback, addMessage, getState: () => state };
}

describe('human agent screen sharing requests', () => {
  it('rejects requests when no agent is connected', async () => {
    const { callback, addMessage, getState } = await createFixture(false);

    await expect(callback.screenShareRequest()).rejects.toThrow(
      'Cannot request screen sharing if no chat is in progress.'
    );

    expect(getState().humanAgentState.showScreenShareRequest).toBe(false);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it('resolves every pending caller from one response without repeating the request message', async () => {
    const { service, callback, addMessage, getState } = await createFixture();
    const first = callback.screenShareRequest();
    const second = callback.screenShareRequest();
    await Promise.resolve();

    expect(getState().humanAgentState.showScreenShareRequest).toBe(true);
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(addMessage).toHaveBeenCalledWith(
      HumanAgentMessageType.SHARING_REQUESTED
    );

    await service.screenShareUpdateRequestState(ScreenShareState.ACCEPTED);

    await expect(Promise.all([first, second])).resolves.toEqual([
      ScreenShareState.ACCEPTED,
      ScreenShareState.ACCEPTED,
    ]);
  });

  it.each([
    [ScreenShareState.ACCEPTED, HumanAgentMessageType.SHARING_ACCEPTED, true],
    [ScreenShareState.DECLINED, HumanAgentMessageType.SHARING_DECLINED, false],
    [
      ScreenShareState.CANCELLED,
      HumanAgentMessageType.SHARING_CANCELLED,
      false,
    ],
    [ScreenShareState.ENDED, HumanAgentMessageType.SHARING_ENDED, false],
  ])(
    'resolves %s and updates the transcript and sharing state',
    async (response, message, isSharing) => {
      const { service, callback, addMessage, getState } = await createFixture();
      const request = callback.screenShareRequest();
      await Promise.resolve();

      await service.screenShareUpdateRequestState(response);

      await expect(request).resolves.toBe(response);
      expect(getState().humanAgentState.showScreenShareRequest).toBe(false);
      expect(getState().humanAgentState.isScreenSharing).toBe(isSharing);
      expect(addMessage).toHaveBeenLastCalledWith(message);
    }
  );

  it('cancels a pending request when the service desk ends sharing', async () => {
    const { callback, addMessage, getState } = await createFixture();
    const request = callback.screenShareRequest();
    await Promise.resolve();

    await callback.screenShareEnded();

    await expect(request).resolves.toBe(ScreenShareState.CANCELLED);
    expect(getState().humanAgentState.showScreenShareRequest).toBe(false);
    expect(getState().humanAgentState.isScreenSharing).toBe(false);
    expect(addMessage).toHaveBeenLastCalledWith(
      HumanAgentMessageType.SHARING_CANCELLED
    );
  });

  it('ends an active session without adding a cancellation message', async () => {
    const { service, callback, addMessage, getState } = await createFixture();
    const request = callback.screenShareRequest();
    await Promise.resolve();
    await service.screenShareUpdateRequestState(ScreenShareState.ACCEPTED);
    await request;
    addMessage.mockClear();

    await callback.screenShareEnded();

    expect(getState().humanAgentState.isScreenSharing).toBe(false);
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(addMessage).toHaveBeenCalledWith(
      HumanAgentMessageType.SHARING_ENDED
    );
  });

  it('does not add a message when no request or session exists', async () => {
    const { callback, addMessage } = await createFixture();

    await callback.screenShareEnded();

    expect(addMessage).not.toHaveBeenCalled();
  });
});
