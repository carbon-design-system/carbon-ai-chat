/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { selectInputIsReadonly } from "../../../src/chat/store/selectors";
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
  CarbonTheme,
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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

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

      await applyConfigChangesDynamically(
        initialStateWithFullHeader.config.public,
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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

      const updatedState = serviceManager.store.getState();

      expect(updatedState.config.public.strings).toEqual(stringOverrides);
      const languagePack = updatedState.languagePack;
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

    // Note: rebuilding `serviceManager.intl` from a strings/locale change is now
    // owned by the `refreshLocalizationOnChange` store subscription (wired in
    // loadServices), not by `applyConfigChangesDynamically`. End-to-end coverage
    // that `formatMessage`/`useIntl` consumers and the dayjs locale track a
    // runtime change lives in the booted integration tests in
    // `tests/config/spec/strings_spec.ts`.

    it("should handle homescreen changes and update homescreen state", async () => {
      const newConfig: PublicConfig = {
        homescreen: {
          isOn: true,
          greeting: "Hello World",
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

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

      await applyConfigChangesDynamically(
        stateWithHomescreenOpen.config.public,
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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

      const updatedState = serviceManager.store.getState();

      // Config should be updated
      expect(updatedState.config.public.isReadonly).toBe(true);

      // Effective readonly is derived from config (not mirrored into state).
      expect(updatedState.assistantInputState.isReadonly).toBeNull();
      expect(selectInputIsReadonly(updatedState)).toBe(true);
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

      await applyConfigChangesDynamically(
        initialStateWithInherit.config.public,
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

    it("should NOT carry forward the previously resolved theme on explicit → inherit transition", async () => {
      // Start with explicit G90 theme. derivedCarbonTheme === G90 here.
      const initialStateExplicit = createInitialAppState({
        injectCarbonTheme: CarbonTheme.G90,
      });
      const serviceManagerExplicit =
        createMockServiceManager(initialStateExplicit);

      expect(
        initialStateExplicit.config.derived.themeWithDefaults
          .originalCarbonTheme,
      ).toBe(CarbonTheme.G90);
      expect(
        initialStateExplicit.config.derived.themeWithDefaults
          .derivedCarbonTheme,
      ).toBe(CarbonTheme.G90);

      // Transition to inherit mode by setting injectCarbonTheme back to null.
      const newConfig: PublicConfig = { injectCarbonTheme: null };
      await applyConfigChangesDynamically(
        initialStateExplicit.config.public,
        newConfig,
        serviceManagerExplicit,
      );

      const updatedState = serviceManagerExplicit.store.getState();

      // The carry-forward must NOT fire on explicit → inherit, so the previous
      // explicit G90 must not linger as the derived theme. It is the
      // freshly-built null from createAppConfig; ThemeWatcherService — kicked
      // off by the originalCarbonTheme flip via loadServices.ts — then resolves
      // the actual host theme.
      expect(
        updatedState.config.derived.themeWithDefaults.originalCarbonTheme,
      ).toBeNull();
      expect(
        updatedState.config.derived.themeWithDefaults.derivedCarbonTheme,
      ).toBeNull();
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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

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

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager,
      );

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

      // Effective readonly derives from config; homescreen state is applied.
      expect(selectInputIsReadonly(updatedState as AppState)).toBe(true);
      expect(
        (updatedState as AppState).persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(true);
    });

    describe("disclaimer invalidation", () => {
      it("clears the recorded acceptance for the current hostname when the disclaimer content changes", async () => {
        const hostname = window.location.hostname;

        const stateWithAcceptance = createInitialAppState({
          disclaimer: { isOn: true, disclaimerHTML: "<p>Original</p>" },
        });
        stateWithAcceptance.persistedToBrowserStorage = {
          ...stateWithAcceptance.persistedToBrowserStorage,
          disclaimersAccepted: {
            [hostname]: true,
            "other-host.example": true,
          },
        };
        const sm = createMockServiceManager(stateWithAcceptance);

        const newConfig: PublicConfig = {
          disclaimer: { isOn: true, disclaimerHTML: "<p>Updated</p>" },
        };
        await applyConfigChangesDynamically(
          stateWithAcceptance.config.public,
          newConfig,
          sm,
        );

        const accepted =
          sm.store.getState().persistedToBrowserStorage.disclaimersAccepted;
        // This hostname must re-accept the new disclaimer. Acceptance is a truthy
        // read, and the value is set false (not deleted) so it survives the
        // reducer's deep merge of persistedToBrowserStorage.
        expect(accepted[hostname]).toBeFalsy();
        // ...but acceptance for other hostnames is untouched.
        expect(accepted["other-host.example"]).toBe(true);
      });
    });

    describe("error handling", () => {
      it("should handle null/undefined configs gracefully", async () => {
        const newConfig: PublicConfig = {
          header: null as any,
        };

        expect(async () => {
          await applyConfigChangesDynamically(
            initialState.config.public,
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
