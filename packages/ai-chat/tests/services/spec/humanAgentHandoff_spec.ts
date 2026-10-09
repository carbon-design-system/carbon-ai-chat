/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { makeConfigStore } from '../../test_helpers';
import { outputItemToLocalItem } from '../../../src/chat/schema/outputItemToLocalItem';
import { ChatInstanceService } from '../../../src/chat/services/ChatInstanceService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { HumanAgentsOnlineStatus } from '../../../src/chat/services/haa/HumanAgentService';
import createHumanAgentService from '../../../src/chat/services/haa/HumanAgentServiceImpl';
import actions from '../../../src/chat/store/actions';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

function createFixture(
  skipConnectHumanAgentCard = true,
  serviceDeskConfigured = true
) {
  const store = makeConfigStore({
    serviceDeskFactory: serviceDeskConfigured ? jest.fn() : undefined,
    serviceDesk: { skipConnectHumanAgentCard },
  });
  const manager = { store, restartCount: 0 } as unknown as ServiceManager;
  const service = createHumanAgentService(manager);
  manager.humanAgentService = service;
  const checkAvailability = jest
    .spyOn(service, 'checkAreAnyHumanAgentsOnline')
    .mockResolvedValue(HumanAgentsOnlineStatus.UNKNOWN);
  const startChat = jest
    .spyOn(service, 'startChat')
    .mockResolvedValue(undefined);
  const message: MessageResponse = {
    id: 'connect-response',
    output: {
      generic: [{ response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT }],
    },
    history: { timestamp: Date.now() },
    ui_state_internal: {},
  };
  const localMessage = outputItemToLocalItem(
    message.output.generic[0],
    message
  );
  store.dispatch(actions.addMessage(message));

  const handleConnect = () =>
    service.handleConnectToHumanAgent(
      localMessage,
      message,
      store.getState().config,
      manager.restartCount
    );

  return {
    manager,
    store,
    message,
    localMessage,
    checkAvailability,
    startChat,
    handleConnect,
  };
}

describe('human agent handoff', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts the current service after replacement during an availability check', async () => {
    const {
      manager,
      store,
      message,
      localMessage,
      checkAvailability,
      startChat,
      handleConnect,
    } = createFixture();
    const availability = resolvablePromise<HumanAgentsOnlineStatus>();
    checkAvailability.mockReturnValueOnce(availability);
    const pending = handleConnect();

    expect(checkAvailability).toHaveBeenCalledWith(message);
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      1
    );

    const replacement = createHumanAgentService(manager);
    const startReplacementChat = jest
      .spyOn(replacement, 'startChat')
      .mockResolvedValue(undefined);
    manager.humanAgentService = replacement;
    availability.doResolve(HumanAgentsOnlineStatus.ONLINE);
    await pending;

    expect(startChat).not.toHaveBeenCalled();
    expect(startReplacementChat).toHaveBeenCalledTimes(1);
    expect(startReplacementChat).toHaveBeenCalledWith(localMessage, message);
    expect(
      store.getState().allMessagesByID[message.id].ui_state_internal
        .agent_availability
    ).toBe(HumanAgentsOnlineStatus.ONLINE);
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
  });

  it('records offline availability without starting a chat', async () => {
    const { store, message, checkAvailability, startChat, handleConnect } =
      createFixture();
    checkAvailability.mockResolvedValueOnce(HumanAgentsOnlineStatus.OFFLINE);

    await handleConnect();

    expect(startChat).not.toHaveBeenCalled();
    expect(
      store.getState().allMessagesByID[message.id].ui_state_internal
        .agent_availability
    ).toBe(HumanAgentsOnlineStatus.OFFLINE);
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
  });

  it('reports a missing service desk and releases the loading indicator', async () => {
    const {
      manager,
      store,
      message,
      checkAvailability,
      startChat,
      handleConnect,
    } = createFixture(true, false);
    checkAvailability.mockRestore();
    manager.fire = jest.fn().mockResolvedValue(undefined);
    manager.actions = new ChatInstanceService(manager);
    const errorOccurred = jest.spyOn(manager.actions, 'errorOccurred');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(handleConnect()).resolves.toBeUndefined();

    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(errorOccurred).toHaveBeenCalledWith({
      errorType: OnErrorType.INTEGRATION_ERROR,
      message: expect.stringContaining('there is no service desk configured'),
    });
    expect(
      store.getState().allMessagesByID[message.id].ui_state_internal
    ).toEqual(
      expect.objectContaining({
        agent_no_service_desk: true,
        agent_availability: HumanAgentsOnlineStatus.UNKNOWN,
      })
    );
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
    expect(startChat).not.toHaveBeenCalled();
  });

  it('leaves online connection to the card when automatic connection is disabled', async () => {
    const { checkAvailability, startChat, handleConnect } =
      createFixture(false);
    checkAvailability.mockResolvedValueOnce(HumanAgentsOnlineStatus.ONLINE);

    await handleConnect();

    expect(startChat).not.toHaveBeenCalled();
  });

  it('drops an availability result when the conversation restarts', async () => {
    const { manager, store, checkAvailability, startChat, handleConnect } =
      createFixture();
    const availability = resolvablePromise<HumanAgentsOnlineStatus>();
    checkAvailability.mockReturnValueOnce(availability);
    const pending = handleConnect();

    manager.restartCount++;
    store.dispatch(actions.resetIsLoadingCounter());
    store.dispatch(actions.restartConversation());
    availability.doResolve(HumanAgentsOnlineStatus.ONLINE);
    await pending;

    expect(startChat).not.toHaveBeenCalled();
    expect(store.getState().allMessagesByID).toEqual({});
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
  });
});
