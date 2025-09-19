/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { createAppStore } from "../../../src/chat/store/appStore";
import {
  createAppConfig,
  createInitialState,
} from "../../../src/chat/store/doCreateStore";
import { reducers } from "../../../src/chat/store/reducers";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { AppState } from "../../../src/types/state/AppState";
import {
  PublicConfig,
  enLanguagePack,
} from "../../../src/types/config/PublicConfig";

// Mock ServiceManager for testing
const createMockServiceManager = (initialState: AppState): ServiceManager => {
  const store = createAppStore(
    (
      state: AppState,
      action: { type: string; [key: string]: unknown } | undefined,
    ): AppState => {
      return action && reducers[action.type]
        ? reducers[action.type](state, action)
        : state;
    },
    initialState,
  );

  return {
    store,
    namespace: {
      suffix: "-test",
    },
  } as any; // Simplified mock
};

function createInitialAppState(config: PublicConfig = {}): AppState {
  return createInitialState(createAppConfig(config));
}

describe("Dynamic Config Updates", () => {
  let serviceManager: ServiceManager;
  let initialState: AppState;

  beforeEach(() => {
    initialState = createInitialAppState({
      debug: false,
      header: {
        title: "Initial Title",
        showRestartButton: true,
      },
    });
    serviceManager = createMockServiceManager(initialState);
  });

  describe("applyConfigChangesDynamically", () => {
    it("should update the Redux store with new config", async () => {
      const newConfig: PublicConfig = {
        debug: true,
        header: {
          title: "Updated Title",
          showRestartButton: false,
        },
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();
      expect(updatedState.config.public.debug).toBe(true);
      expect(updatedState.config.derived.header?.title).toBe("Updated Title");
      expect(updatedState.config.derived.header?.showRestartButton).toBe(false);
    });

    it("should handle header property deletion correctly", async () => {
      // Start with a header that has multiple properties
      const initialConfig: PublicConfig = {
        header: {
          title: "Test Title",
          name: "Assistant Name",
          showRestartButton: true,
          hideMinimizeButton: false,
          menuOptions: [
            { text: "Help", handler: () => {} },
            { text: "Settings", handler: () => {} },
          ],
        },
      };

      const initialStateWithFullHeader = createInitialAppState(initialConfig);
      const serviceManagerWithFullHeader = createMockServiceManager(
        initialStateWithFullHeader,
      );

      // Update to config with some properties deleted
      const newConfig: PublicConfig = {
        header: {
          title: "Updated Title",
          // name, showRestartButton, hideMinimizeButton, and menuOptions should be deleted
        },
      };

      const changes = detectConfigChanges(
        initialStateWithFullHeader.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(
        changes,
        newConfig,
        serviceManagerWithFullHeader,
      );

      const updatedState = serviceManagerWithFullHeader.store.getState();
      const header = updatedState.config.derived.header;

      // Property that was updated should be present
      expect(header?.title).toBe("Updated Title");

      // Properties that were deleted should be undefined
      expect(header?.name).toBeUndefined();
      expect(header?.showRestartButton).toBeUndefined();
      expect(header?.hideMinimizeButton).toBeUndefined();
      expect(header?.menuOptions).toBeUndefined();
    });

    it("should handle complete header replacement", async () => {
      const newConfig: PublicConfig = {
        header: {
          name: "New Assistant",
          // All other header properties should be gone
        },
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();
      const header = updatedState.config.derived.header;

      expect(header?.name).toBe("New Assistant");
      expect(header?.title).toBeUndefined();
      expect(header?.showRestartButton).toBeUndefined();
    });

    it("should merge partial string overrides into the language pack", async () => {
      const stringOverrides = {
        input_placeholder: "Ask me anything",
        launcher_isOpen: "Close assistant",
      };

      const newConfig: PublicConfig = {
        ...initialState.config.public,
        strings: stringOverrides,
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();

      expect(updatedState.config.public.strings).toEqual(stringOverrides);
      const languagePack = updatedState.config.derived.languagePack;
      expect(languagePack.input_placeholder).toBe(
        stringOverrides.input_placeholder,
      );
      expect(languagePack.launcher_isOpen).toBe(
        stringOverrides.launcher_isOpen,
      );
      expect(languagePack.launcher_isClosed).toBe(
        enLanguagePack.launcher_isClosed,
      );
    });

    it("should handle homescreen changes and update homescreen state", async () => {
      const newConfig: PublicConfig = {
        homescreen: {
          isOn: true,
          greeting: "Hello World",
        },
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();

      // Config should be updated
      expect(updatedState.config.public.homescreen?.isOn).toBe(true);
      expect(updatedState.config.public.homescreen?.greeting).toBe(
        "Hello World",
      );

      // Homescreen state should be opened since messageIDs length is 0
      expect(
        (updatedState as AppState).persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(true);
    });

    it("should handle homescreen being turned off", async () => {
      // Start with homescreen on and open
      const initialConfigWithHomescreen: PublicConfig = {
        homescreen: { isOn: true },
      };
      const stateWithHomescreenOpen = createInitialAppState(
        initialConfigWithHomescreen,
      );
      stateWithHomescreenOpen.persistedToBrowserStorage = {
        ...stateWithHomescreenOpen.persistedToBrowserStorage,
        homeScreenState: {
          ...stateWithHomescreenOpen.persistedToBrowserStorage.homeScreenState,
          isHomeScreenOpen: true,
        },
      };

      const serviceManagerWithHomescreen = createMockServiceManager(
        stateWithHomescreenOpen,
      );

      const newConfig: PublicConfig = {
        homescreen: { isOn: false },
      };

      const changes = detectConfigChanges(
        stateWithHomescreenOpen.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(
        changes,
        newConfig,
        serviceManagerWithHomescreen,
      );

      const updatedState = serviceManagerWithHomescreen.store.getState();

      // Config should be updated
      expect(updatedState.config.public.homescreen?.isOn).toBe(false);

      // Homescreen state should be closed
      expect(
        (updatedState as AppState).persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(false);
    });

    it("should handle readonly state changes", async () => {
      const newConfig: PublicConfig = {
        isReadonly: true,
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();

      // Config should be updated
      expect(updatedState.config.public.isReadonly).toBe(true);

      // Bot input state should reflect readonly change
      expect(updatedState.botInputState.isReadonly).toBe(true);
    });

    it("should preserve derived theme properties correctly", async () => {
      // Start with inherit mode (originalCarbonTheme is null)
      const initialStateWithInherit = createInitialAppState({
        injectCarbonTheme: null,
      });
      const serviceManagerWithInherit = createMockServiceManager(
        initialStateWithInherit,
      );

      const originalDerivedTheme =
        initialStateWithInherit.config.derived.themeWithDefaults
          .derivedCarbonTheme;

      const newConfig: PublicConfig = {
        debug: true, // Lightweight change that doesn't affect theme
      };

      const changes = detectConfigChanges(
        initialStateWithInherit.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(
        changes,
        newConfig,
        serviceManagerWithInherit,
      );

      const updatedState = serviceManagerWithInherit.store.getState();

      // Config should be updated
      expect(updatedState.config.public.debug).toBe(true);

      // Derived theme should be preserved since originalCarbonTheme is null
      expect(
        updatedState.config.derived.themeWithDefaults.derivedCarbonTheme,
      ).toBe(originalDerivedTheme);
    });

    it("should handle messaging timeout updates", async () => {
      // Mock message service for testing
      const mockMessageService = {
        timeoutMS: 30000,
      };
      serviceManager.messageService = mockMessageService as any;

      const newConfig: PublicConfig = {
        messaging: {
          messageTimeoutSecs: 60,
        },
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();

      // Config should be updated
      expect(updatedState.config.public.messaging?.messageTimeoutSecs).toBe(60);

      // Message service timeout should be updated
      expect(mockMessageService.timeoutMS).toBe(60000); // 60 seconds in milliseconds
    });

    it("should handle multiple simultaneous changes", async () => {
      const newConfig: PublicConfig = {
        debug: true,
        isReadonly: true,
        header: {
          title: "Multi-Change Title",
        },
        homescreen: {
          isOn: true,
          greeting: "Multi-Change Greeting",
        },
      };

      const changes = detectConfigChanges(
        initialState.config.public,
        newConfig,
      );

      await applyConfigChangesDynamically(changes, newConfig, serviceManager);

      const updatedState = serviceManager.store.getState();

      // All changes should be applied
      expect(updatedState.config.public.debug).toBe(true);
      expect(updatedState.config.public.isReadonly).toBe(true);
      expect(updatedState.config.derived.header?.title).toBe(
        "Multi-Change Title",
      );
      expect(updatedState.config.public.homescreen?.isOn).toBe(true);
      expect(updatedState.config.public.homescreen?.greeting).toBe(
        "Multi-Change Greeting",
      );

      // State changes should be applied
      expect((updatedState as AppState).botInputState.isReadonly).toBe(true);
      expect(
        (updatedState as AppState).persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(true);
    });

    describe("error handling", () => {
      it("should handle null/undefined configs gracefully", async () => {
        const newConfig: PublicConfig = {
          header: null as any,
        };

        const changes = detectConfigChanges(
          initialState.config.public,
          newConfig,
        );

        expect(async () => {
          await applyConfigChangesDynamically(
            changes,
            newConfig,
            serviceManager,
          );
        }).not.toThrow();

        const updatedState = serviceManager.store.getState();
        expect(updatedState.config.derived.header).toBeNull();
      });
    });
  });
});
