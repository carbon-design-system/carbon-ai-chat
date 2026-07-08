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

import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { createAppStore } from "../../../src/chat/store/appStore";
import {
  createAppConfig,
  createInitialState,
} from "../../../src/chat/store/doCreateStore";
import { reducers } from "../../../src/chat/store/reducers";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { AppState } from "../../../src/types/state/AppState";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

jest.mock("../../../src/chat/services/haa/HumanAgentServiceImpl", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    hasInitialized: false,
    initialize: jest.fn(),
    endChat: jest.fn(),
  })),
}));
import createHumanAgentService from "../../../src/chat/services/haa/HumanAgentServiceImpl";

function createStore(initialState: AppState) {
  return createAppStore(
    (
      state: AppState,
      action: { type: string; [key: string]: unknown } | undefined,
    ): AppState =>
      action && reducers[action.type]
        ? reducers[action.type](state, action)
        : state,
    initialState,
  );
}

const factoryA = () => ({}) as any;
const factoryB = () => ({}) as any;

function setup(
  options: {
    hasInitialized?: boolean;
    connected?: boolean;
  } = {},
) {
  const initialState = createInitialState(
    createAppConfig({ serviceDeskFactory: factoryA }),
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
    initialize: jest.fn(),
    endChat: jest.fn(),
  };

  const serviceManager = {
    store: createStore(initialState),
    namespace: { suffix: "" },
    messageService: { timeoutMS: 30000 },
    humanAgentService,
  } as any as ServiceManager;

  return { serviceManager, humanAgentService };
}

async function applyFactoryChange(serviceManager: ServiceManager) {
  const prev = serviceManager.store.getState().config.public;
  const next: PublicConfig = { serviceDeskFactory: factoryB };
  await applyConfigChangesDynamically(prev, next, serviceManager);
}

describe("human-agent serviceDeskFactory reference change", () => {
  beforeEach(() => {
    (createHumanAgentService as jest.Mock).mockClear();
  });

  it("does NOT rebuild an idle service (never initialized, not connected)", async () => {
    const { serviceManager, humanAgentService } = setup();
    await applyFactoryChange(serviceManager);

    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it("still updates the config factory when skipping an idle rebuild, so a future chat adopts it", async () => {
    const { serviceManager } = setup();
    await applyFactoryChange(serviceManager);

    // The service is not rebuilt, but the config replace still ran — so a future
    // chat (which reads serviceDeskFactory live from config at start) gets factoryB.
    expect(createHumanAgentService).not.toHaveBeenCalled();
    expect(
      serviceManager.store.getState().config.public.serviceDeskFactory,
    ).toBe(factoryB);
  });

  it("rebuilds an initialized service so it adopts the new factory", async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
    });
    await applyFactoryChange(serviceManager);

    expect(createHumanAgentService).toHaveBeenCalledTimes(1);
    // Idle-but-initialized: not connected, so no chat is torn down.
    expect(humanAgentService.endChat).not.toHaveBeenCalled();
  });

  it("re-initializes the rebuilt service when the previous one was initialized", async () => {
    const { serviceManager } = setup({ hasInitialized: true });
    await applyFactoryChange(serviceManager);

    // After the rebuild, serviceManager.humanAgentService is the new instance;
    // it must be initialized so the factory swap preserves the started state.
    const rebuilt = serviceManager.humanAgentService as unknown as {
      initialize: jest.Mock;
    };
    expect(rebuilt.initialize).toHaveBeenCalledTimes(1);
  });

  it("ends and rebuilds an active service", async () => {
    const { serviceManager, humanAgentService } = setup({
      hasInitialized: true,
      connected: true,
    });
    await applyFactoryChange(serviceManager);

    expect(humanAgentService.endChat).toHaveBeenCalledTimes(1);
    expect(createHumanAgentService).toHaveBeenCalledTimes(1);
  });
});
