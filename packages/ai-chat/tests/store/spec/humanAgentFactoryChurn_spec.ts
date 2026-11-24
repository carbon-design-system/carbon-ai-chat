/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The human-agent service is rebuilt when `serviceDeskFactory` changes by
 * reference. Because the factory is read live from config at chat start, an idle
 * service (never initialized, no active chat) needs no rebuild — so a changed
 * factory reference (e.g. a non-memoized config object on an unrelated
 * re-render) must NOT churn the service. An active or initialized service is
 * still rebuilt so it adopts the new factory.
 */

import { applyConfigChangesDynamically } from '../../../src/chat/utils/dynamicConfigUpdates';
import { createAppStore } from '../../../src/sdk/store/appStore';
import { createInitialState } from '../../../src/sdk/store/doCreateStore';
import { createAppConfig } from '../../../src/chat/utils/appConfig';
import { reducers } from '../../../src/sdk/store/reducers';
import { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import { ConversationState } from '../../../src/types/state/AppState';
import { PublicConfig } from '../../../src/types/config/PublicConfig';

jest.mock('../../../src/sdk/services/haa/HumanAgentServiceImpl', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    hasInitialized: false,
    initialize: jest.fn(function (this: { hasInitialized: boolean }) {
      this.hasInitialized = true;
    }),
    endChat: jest.fn(),
  })),
}));
import createHumanAgentService from '../../../src/sdk/services/haa/HumanAgentServiceImpl';
import { withPublicState } from '../../test_helpers';
import { endChat } from '../../../src/sdk/store/humanAgentActions';
import { waitFor } from '@testing-library/react';
import { BusEventType } from '../../../src/types/events/eventBusTypes';

function createStore(initialState: ConversationState) {
  return createAppStore(
    (
      state: ConversationState,
      action: { type: string; [key: string]: unknown } | undefined
    ): ConversationState =>
      action && reducers[action.type]
        ? reducers[action.type](state, action)
        : state,
    initialState
  );
}

const factoryA = () => ({}) as any;
const factoryB = () => ({}) as any;

function setup(
  options: {
    hasInitialized?: boolean;
    connected?: boolean;
    /** Started, with its pre:startChat handlers still running. */
    started?: boolean;
  } = {}
) {
  const initialState = createInitialState(
    createAppConfig({ serviceDeskFactory: factoryA })
  );
  if (options.connected) {
    initialState.persistedToBrowserStorage = {
      ...initialState.persistedToBrowserStorage,
      humanAgentState: {
        ...initialState.persistedToBrowserStorage.humanAgentState,
        isConnected: true,
      },
    };
  }

  const humanAgentService = {
    hasInitialized: Boolean(options.hasInitialized),
    // The desk came from the config's factory at boot.
    serviceDeskFactory: options.hasInitialized ? factoryA : undefined,
    chatStarted: Boolean(options.connected || options.started),
    initialize: jest.fn(),
    endChat: jest.fn(),
  };

  const serviceManager = withPublicState({
    store: createStore(initialState),
    namespace: { suffix: '' },
    messageCoordinator: { timeoutMS: 30000 },
    humanAgentService,
  } as any as ServiceManager);

  return { serviceManager, humanAgentService };
}

async function applyFactoryChange(serviceManager: ServiceManager) {
  const prev = serviceManager.store.getState().config.public;
  const next: PublicConfig = { serviceDeskFactory: factoryB };
  await applyConfigChangesDynamically(prev, next, serviceManager);
}

/** Ends the agent chat as the service does: clears its flag, then the store. */
function endAgentChat(serviceManager: ServiceManager) {
  (serviceManager.humanAgentService as { chatStarted?: boolean }).chatStarted =
    false;
  serviceManager.store.dispatch(endChat());
}

describe('human-agent serviceDeskFactory reference change', () => {
  beforeEach(() => {
    (createHumanAgentService as jest.Mock).mockClear();
  });

  it('does NOT rebuild an idle service (never initialized, not connected)', async () => {
    const { serviceManager, humanAgentService } = setup();
    await applyFactoryChange(serviceManager);

    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it('still updates the config factory when skipping an idle rebuild, so a future chat adopts it', async () => {
    const { serviceManager } = setup();
    await applyFactoryChange(serviceManager);

    // The service is not rebuilt, but the config replace still ran — so a future
    // chat (which reads serviceDeskFactory live from config at start) gets factoryB.
    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(
      serviceManager.store.getState().config.public.serviceDeskFactory
    ).toBe(factoryB);
  });

  it('rebuilds an initialized service so it adopts the new factory', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
    });
    await applyFactoryChange(serviceManager);

    expect(createHumanAgentService).toHaveBeenCalledTimes(1);
    // Idle-but-initialized: not connected, so no chat is torn down.
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it('re-initializes the rebuilt service when the previous one was initialized', async () => {
    const { serviceManager } = setup({ hasInitialized: true });
    await applyFactoryChange(serviceManager);

    // After the rebuild, serviceManager.humanAgentService is the new instance;
    // it must be initialized so the factory swap preserves the started state.
    const rebuilt = serviceManager.humanAgentService as unknown as {
      initialize: jest.Mock;
    };
    expect(rebuilt.initialize).toHaveBeenCalledTimes(1);
  });

  it('keeps a live agent chat on its desk, and switches once it ends (#2353 O1, O2)', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      connected: true,
    });
    await applyFactoryChange(serviceManager);

    expect(humanAgentService.endChat).not.toHaveBeenCalled();
    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(serviceManager.humanAgentService).toBe(humanAgentService);

    endAgentChat(serviceManager);
    await waitFor(() =>
      expect(createHumanAgentService).toHaveBeenCalledTimes(1)
    );
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
    const rebuilt = serviceManager.humanAgentService as unknown as {
      initialize: jest.Mock;
    };
    expect(rebuilt).not.toBe(humanAgentService);
    await waitFor(() => expect(rebuilt.initialize).toHaveBeenCalledTimes(1));
  });

  it('waits once however many times the factory changes during the chat', async () => {
    const { serviceManager } = setup({ hasInitialized: true, connected: true });
    await applyFactoryChange(serviceManager);
    const prev = serviceManager.store.getState().config.public;
    await applyConfigChangesDynamically(
      prev,
      { serviceDeskFactory: factoryA },
      serviceManager
    );
    await applyConfigChangesDynamically(
      serviceManager.store.getState().config.public,
      { serviceDeskFactory: factoryB },
      serviceManager
    );

    endAgentChat(serviceManager);
    await waitFor(() =>
      expect(createHumanAgentService).toHaveBeenCalledTimes(1)
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(createHumanAgentService).toHaveBeenCalledTimes(1);
  });

  it('waits the same way when the factory is removed during the chat', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      connected: true,
    });
    await applyConfigChangesDynamically(
      serviceManager.store.getState().config.public,
      {},
      serviceManager
    );
    expect(serviceManager.humanAgentService).toBe(humanAgentService);
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it('switches at once when the host ended the chat first (O5, O6)', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      connected: true,
    });
    // `serviceDesk.endConversation()` ends the chat through the store.
    endAgentChat(serviceManager);
    await applyFactoryChange(serviceManager);
    expect(createHumanAgentService).toHaveBeenCalledTimes(1);
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it('rebuilds nothing when the factory goes A, B, then A during the chat', async () => {
    const { serviceManager } = setup({ hasInitialized: true, connected: true });
    await applyFactoryChange(serviceManager);
    await applyConfigChangesDynamically(
      serviceManager.store.getState().config.public,
      { serviceDeskFactory: factoryA },
      serviceManager
    );
    endAgentChat(serviceManager);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(createHumanAgentService).not.toHaveBeenCalled();
  });

  it('applies a removed factory once the chat ends', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      connected: true,
    });
    await applyConfigChangesDynamically(
      serviceManager.store.getState().config.public,
      {},
      serviceManager
    );
    expect(createHumanAgentService).not.toHaveBeenCalled();
    endAgentChat(serviceManager);
    await waitFor(() =>
      expect(createHumanAgentService).toHaveBeenCalledTimes(1)
    );
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it('waits for a chat that has started but is not connecting yet', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      started: true,
    });
    await applyFactoryChange(serviceManager);
    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(serviceManager.humanAgentService).toBe(humanAgentService);
  });

  it('switches when the chat ends with only the end-chat event', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      started: true,
    });
    await applyFactoryChange(serviceManager);
    humanAgentService.chatStarted = false;
    await serviceManager.eventBus.fire(
      { type: BusEventType.HUMAN_AGENT_END_CHAT } as never,
      serviceManager.instance
    );
    await waitFor(() =>
      expect(createHumanAgentService).toHaveBeenCalledTimes(1)
    );
  });

  it('leaves a service whose desk already came from the new factory', async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
    });
    Object.assign(humanAgentService, { serviceDeskFactory: factoryB });
    await applyFactoryChange(serviceManager);
    expect(createHumanAgentService).not.toHaveBeenCalled();
  });
});
