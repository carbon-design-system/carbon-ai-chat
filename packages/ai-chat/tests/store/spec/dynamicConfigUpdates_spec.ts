/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { applyConfigChangesDynamically } from '../../../src/chat/utils/dynamicConfigUpdates';

import { selectInputIsReadonly } from '../../../src/sdk/store/selectors';

import { createAppStore } from '../../../src/sdk/store/appStore';

import { createInitialState } from '../../../src/sdk/store/doCreateStore';

import { ServiceManager } from '../../../src/sdk/services/ServiceManager';

import { AppState } from '../../../src/types/state/AppState';

import { PublicConfig } from '../../../src/types/config/PublicConfig';

import { enLanguagePack } from '../../../src/types/config/LanguagePack';

import { CarbonTheme } from '../../../src/types/config/CarbonTheme';

import { appRootReducer } from '../../test_helpers';

import { createInitialViewState } from '../../../src/chat/state/initialState';

import { chatStore } from '../../../src/chat/services/attachChatView';

// Mock ServiceManager for testing
const createMockServiceManager = (initialState: AppState): ServiceManager => {
  const store = createAppStore(appRootReducer, initialState);

  return {
    store,
    namespace: {
      suffix: '-test',
    },
  } as any; // Simplified mock
};

function createInitialAppState(config: PublicConfig = {}): AppState {
  const appConfig = { public: config };
  return {
    ...createInitialState(appConfig),
    // The same object; restated so the state is typed with the whole config.
    config: appConfig,
    view: createInitialViewState(config, null),
  };
}

describe('Dynamic Config Updates', () => {
  let serviceManager: ServiceManager;
  let initialState: AppState;

  beforeEach(() => {
    initialState = createInitialAppState({
      debug: false,
      header: {
        title: 'Initial Title',
        showRestartButton: true,
      },
    });
    serviceManager = createMockServiceManager(initialState);
  });

  describe('applyConfigChangesDynamically', () => {
    it('should update the Redux store with new config', async () => {
      const newConfig: PublicConfig = {
        debug: true,
        header: {
          title: 'Updated Title',
          showRestartButton: false,
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();
      expect(updatedState.config.public.debug).toBe(true);
      expect(updatedState.view.derivedConfig.header?.title).toBe(
        'Updated Title'
      );
      expect(updatedState.view.derivedConfig.header?.showRestartButton).toBe(
        false
      );
    });

    it('should re-merge keyboard shortcut defaults on a runtime config change', async () => {
      await applyConfigChangesDynamically(
        initialState.config.public,
        { keyboardShortcuts: { messageFocusToggle: { key: 'F7' } } },
        serviceManager
      );

      // A partial config inherits the other fields one by one rather than replacing the
      // whole default object.
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F7', modifiers: {}, isOn: false });
    });

    it('should resolve the full default binding from an isOn-only config', async () => {
      await applyConfigChangesDynamically(
        initialState.config.public,
        { keyboardShortcuts: { messageFocusToggle: { isOn: true } } },
        serviceManager
      );

      // What the demo's keyboard-shortcut switcher dispatches: the toggle alone.
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F6', modifiers: {}, isOn: true });
    });

    it('should turn the keyboard shortcut on and back off at runtime', async () => {
      // Turn it on with a non-default key so the retraction below can't pass by
      // coincidence: if the update failed to take, the key would still read F7.
      await applyConfigChangesDynamically(
        initialState.config.public,
        {
          keyboardShortcuts: {
            messageFocusToggle: { key: 'F7', modifiers: {}, isOn: true },
          },
        },
        serviceManager
      );
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F7', modifiers: {}, isOn: true });

      // Retract with an explicit `isOn: false` — the toggle alone, which is what
      // the demo's switcher dispatches.
      await applyConfigChangesDynamically(
        chatStore(serviceManager).getState().config.public,
        { keyboardShortcuts: { messageFocusToggle: { isOn: false } } },
        serviceManager
      );
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F6', modifiers: {}, isOn: false });
    });

    it('should rebuild from the new config rather than merging onto the previous one', async () => {
      await applyConfigChangesDynamically(
        initialState.config.public,
        {
          keyboardShortcuts: {
            messageFocusToggle: { key: 'F7', modifiers: {}, isOn: true },
          },
        },
        serviceManager
      );

      // `applyConfigChangesDynamically` passes the new config straight to
      // `createDerivedConfig`, so an omitted `keyboardShortcuts` is not "unchanged"
      // — it drops back to the factory default rather than carrying F7 forward.
      await applyConfigChangesDynamically(
        chatStore(serviceManager).getState().config.public,
        {},
        serviceManager
      );
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .keyboardShortcuts.messageFocusToggle
      ).toEqual({ key: 'F6', modifiers: {}, isOn: false });
    });

    it('should handle header property deletion correctly', async () => {
      // Start with a header that has multiple properties
      const initialConfig: PublicConfig = {
        header: {
          title: 'Test Title',
          name: 'Assistant Name',
          showRestartButton: true,
          hideMinimizeButton: false,
          menuOptions: [
            { text: 'Help', handler: () => {} },
            { text: 'Settings', handler: () => {} },
          ],
        },
      };

      const initialStateWithFullHeader = createInitialAppState(initialConfig);
      const serviceManagerWithFullHeader = createMockServiceManager(
        initialStateWithFullHeader
      );

      // Update to config with some properties deleted
      const newConfig: PublicConfig = {
        header: {
          title: 'Updated Title',
          // name, showRestartButton, hideMinimizeButton, and menuOptions should be deleted
        },
      };

      await applyConfigChangesDynamically(
        initialStateWithFullHeader.config.public,
        newConfig,
        serviceManagerWithFullHeader
      );

      const updatedState = chatStore(serviceManagerWithFullHeader).getState();
      const header = updatedState.view.derivedConfig.header;

      // Property that was updated should be present
      expect(header?.title).toBe('Updated Title');

      // Properties that were deleted should be undefined
      expect(header?.name).toBeUndefined();
      expect(header?.showRestartButton).toBeUndefined();
      expect(header?.hideMinimizeButton).toBeUndefined();
      expect(header?.menuOptions).toBeUndefined();
    });

    it('should handle complete header replacement', async () => {
      const newConfig: PublicConfig = {
        header: {
          name: 'New Assistant',
          // All other header properties should be gone
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();
      const header = updatedState.view.derivedConfig.header;

      expect(header?.name).toBe('New Assistant');
      expect(header?.title).toBeUndefined();
      expect(header?.showRestartButton).toBeUndefined();
    });

    it('should merge partial string overrides into the language pack', async () => {
      const stringOverrides = {
        input_placeholder: 'Ask me anything',
        launcher_isOpen: 'Close assistant',
      };

      const newConfig: PublicConfig = {
        ...initialState.config.public,
        strings: stringOverrides,
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();

      expect(updatedState.config.public.strings).toEqual(stringOverrides);
      const languagePack = updatedState.languagePack;
      expect(languagePack.input_placeholder).toBe(
        stringOverrides.input_placeholder
      );
      expect(languagePack.launcher_isOpen).toBe(
        stringOverrides.launcher_isOpen
      );
      expect(languagePack.launcher_isClosed).toBe(
        enLanguagePack.launcher_isClosed
      );
    });

    // Note: rebuilding `serviceManager.intl` from a strings/locale change is now
    // owned by the `refreshLocalizationOnChange` store subscription (wired in
    // loadServices), not by `applyConfigChangesDynamically`. End-to-end coverage
    // that `formatMessage`/`useIntl` consumers and the dayjs locale track a
    // runtime change lives in the booted integration tests in
    // `tests/config/spec/strings_spec.ts`.

    it('should handle homescreen changes and update homescreen state', async () => {
      const newConfig: PublicConfig = {
        homescreen: {
          isOn: true,
          greeting: 'Hello World',
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();

      // Config should be updated
      expect(updatedState.config.public.homescreen?.isOn).toBe(true);
      expect(updatedState.config.public.homescreen?.greeting).toBe(
        'Hello World'
      );

      // Homescreen state should be opened since messageIDs length is 0
      expect(
        (updatedState as AppState).view.persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen
      ).toBe(true);
    });

    it('should handle homescreen being turned off', async () => {
      // Start with homescreen on and open
      const initialConfigWithHomescreen: PublicConfig = {
        homescreen: { isOn: true },
      };
      const stateWithHomescreenOpen = createInitialAppState(
        initialConfigWithHomescreen
      );
      stateWithHomescreenOpen.view.persistedToBrowserStorage = {
        ...stateWithHomescreenOpen.view.persistedToBrowserStorage,
        homeScreenState: {
          ...stateWithHomescreenOpen.view.persistedToBrowserStorage
            .homeScreenState,
          isHomeScreenOpen: true,
        },
      };

      const serviceManagerWithHomescreen = createMockServiceManager(
        stateWithHomescreenOpen
      );

      const newConfig: PublicConfig = {
        homescreen: { isOn: false },
      };

      await applyConfigChangesDynamically(
        stateWithHomescreenOpen.config.public,
        newConfig,
        serviceManagerWithHomescreen
      );

      const updatedState = serviceManagerWithHomescreen.store.getState();

      // Config should be updated
      expect(updatedState.config.public.homescreen?.isOn).toBe(false);

      // Homescreen state should be closed
      expect(
        (updatedState as AppState).view.persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen
      ).toBe(false);
    });

    it('should handle readonly state changes', async () => {
      const newConfig: PublicConfig = {
        isReadonly: true,
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();

      // Config should be updated
      expect(updatedState.config.public.isReadonly).toBe(true);

      // Effective readonly is derived from config (not mirrored into state).
      expect(updatedState.assistantInputState.isReadonly).toBeNull();
      expect(selectInputIsReadonly(updatedState)).toBe(true);
    });

    it('should preserve derived theme properties correctly', async () => {
      // Start with inherit mode (originalCarbonTheme is null)
      const initialStateWithInherit = createInitialAppState({
        injectCarbonTheme: null,
      });
      const serviceManagerWithInherit = createMockServiceManager(
        initialStateWithInherit
      );

      const originalDerivedTheme =
        initialStateWithInherit.view.derivedConfig.themeWithDefaults
          .derivedCarbonTheme;

      const newConfig: PublicConfig = {
        debug: true, // Lightweight change that doesn't affect theme
      };

      await applyConfigChangesDynamically(
        initialStateWithInherit.config.public,
        newConfig,
        serviceManagerWithInherit
      );

      const updatedState = chatStore(serviceManagerWithInherit).getState();

      // Config should be updated
      expect(updatedState.config.public.debug).toBe(true);

      // Derived theme should be preserved since originalCarbonTheme is null
      expect(
        updatedState.view.derivedConfig.themeWithDefaults.derivedCarbonTheme
      ).toBe(originalDerivedTheme);
    });

    it('should NOT carry forward the previously resolved theme on explicit → inherit transition', async () => {
      // Start with explicit G90 theme. derivedCarbonTheme === G90 here.
      const initialStateExplicit = createInitialAppState({
        injectCarbonTheme: CarbonTheme.G90,
      });
      const serviceManagerExplicit =
        createMockServiceManager(initialStateExplicit);

      expect(
        initialStateExplicit.view.derivedConfig.themeWithDefaults
          .originalCarbonTheme
      ).toBe(CarbonTheme.G90);
      expect(
        initialStateExplicit.view.derivedConfig.themeWithDefaults
          .derivedCarbonTheme
      ).toBe(CarbonTheme.G90);

      // Transition to inherit mode by setting injectCarbonTheme back to null.
      const newConfig: PublicConfig = { injectCarbonTheme: null };
      await applyConfigChangesDynamically(
        initialStateExplicit.config.public,
        newConfig,
        serviceManagerExplicit
      );

      const updatedState = chatStore(serviceManagerExplicit).getState();

      // The carry-forward must NOT fire on explicit → inherit, so the previous
      // explicit G90 must not linger as the derived theme. It is the
      // freshly-built null from createDerivedConfig; ThemeWatcherService — kicked
      // off by the originalCarbonTheme flip via loadServices.ts — then resolves
      // the actual host theme.
      expect(
        updatedState.view.derivedConfig.themeWithDefaults.originalCarbonTheme
      ).toBeNull();
      expect(
        updatedState.view.derivedConfig.themeWithDefaults.derivedCarbonTheme
      ).toBeNull();
    });

    it('should handle messaging timeout updates', async () => {
      // Mock message service for testing
      const mockMessageService = {
        timeoutMS: 30000,
      };
      serviceManager.messageCoordinator = mockMessageService as any;

      const newConfig: PublicConfig = {
        messaging: {
          messageTimeoutSecs: 60,
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();

      // Config should be updated
      expect(updatedState.config.public.messaging?.messageTimeoutSecs).toBe(60);

      // Message service timeout should be updated
      expect(mockMessageService.timeoutMS).toBe(60000); // 60 seconds in milliseconds
    });

    it('should handle multiple simultaneous changes', async () => {
      const newConfig: PublicConfig = {
        debug: true,
        isReadonly: true,
        header: {
          title: 'Multi-Change Title',
        },
        homescreen: {
          isOn: true,
          greeting: 'Multi-Change Greeting',
        },
      };

      await applyConfigChangesDynamically(
        initialState.config.public,
        newConfig,
        serviceManager
      );

      const updatedState = chatStore(serviceManager).getState();

      // All changes should be applied
      expect(updatedState.config.public.debug).toBe(true);
      expect(updatedState.config.public.isReadonly).toBe(true);
      expect(updatedState.view.derivedConfig.header?.title).toBe(
        'Multi-Change Title'
      );
      expect(updatedState.config.public.homescreen?.isOn).toBe(true);
      expect(updatedState.config.public.homescreen?.greeting).toBe(
        'Multi-Change Greeting'
      );

      // Effective readonly derives from config; homescreen state is applied.
      expect(selectInputIsReadonly(updatedState as AppState)).toBe(true);
      expect(
        (updatedState as AppState).view.persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen
      ).toBe(true);
    });

    describe('disclaimer invalidation', () => {
      it('saves nothing when the acceptance is already cleared', async () => {
        const hostname = window.location.hostname;
        const state = createInitialAppState({
          disclaimer: { isOn: true, disclaimerHTML: '<p>Original</p>' },
        });
        state.view.persistedToBrowserStorage = {
          ...state.view.persistedToBrowserStorage,
          disclaimersAccepted: { [hostname]: false },
        };
        const sm = createMockServiceManager(state);
        const before = chatStore(sm).getState().view.persistedToBrowserStorage;

        await applyConfigChangesDynamically(
          state.config.public,
          { disclaimer: { isOn: true, disclaimerHTML: '<p>Updated</p>' } },
          sm
        );

        expect(chatStore(sm).getState().view.persistedToBrowserStorage).toBe(
          before
        );
      });

      it('clears the recorded acceptance for the current hostname when the disclaimer content changes', async () => {
        const hostname = window.location.hostname;

        const stateWithAcceptance = createInitialAppState({
          disclaimer: { isOn: true, disclaimerHTML: '<p>Original</p>' },
        });
        stateWithAcceptance.view.persistedToBrowserStorage = {
          ...stateWithAcceptance.view.persistedToBrowserStorage,
          disclaimersAccepted: {
            [hostname]: true,
            'other-host.example': true,
          },
        };
        const sm = createMockServiceManager(stateWithAcceptance);

        const newConfig: PublicConfig = {
          disclaimer: { isOn: true, disclaimerHTML: '<p>Updated</p>' },
        };
        await applyConfigChangesDynamically(
          stateWithAcceptance.config.public,
          newConfig,
          sm
        );

        const accepted =
          chatStore(sm).getState().view.persistedToBrowserStorage
            .disclaimersAccepted;
        // This hostname must re-accept the new disclaimer. Acceptance is a truthy
        // read, and the value is set false (not deleted) so it survives the
        // reducer's deep merge of persistedToBrowserStorage.
        expect(accepted[hostname]).toBeFalsy();
        // ...but acceptance for other hostnames is untouched.
        expect(accepted['other-host.example']).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle null/undefined configs gracefully', async () => {
        const newConfig: PublicConfig = {
          header: null as any,
        };

        expect(async () => {
          await applyConfigChangesDynamically(
            initialState.config.public,
            newConfig,
            serviceManager
          );
        }).not.toThrow();

        const updatedState = chatStore(serviceManager).getState();
        expect(updatedState.view.derivedConfig.header).toBeNull();
      });
    });
  });
});
