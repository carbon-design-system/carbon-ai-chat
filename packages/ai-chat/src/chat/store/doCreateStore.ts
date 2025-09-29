/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import mergeWith from "lodash-es/mergeWith.js";
import { ServiceManager } from "../services/ServiceManager";
import { AppConfig } from "../../types/state/AppConfig";
import { AppState, ThemeState } from "../../types/state/AppState";
import { IS_PHONE } from "../utils/browserUtils";
import { CornersType } from "../utils/constants";
import { LanguagePack, PublicConfig } from "../../types/config/PublicConfig";
import { mergeCSSVariables } from "../utils/styleUtils";
import { reducers } from "./reducers";
import { AppStore, createAppStore } from "./appStore";
import {
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_INPUT_STATE,
  DEFAULT_LAUNCHER,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
  DEFAULT_THEME_STATE,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_LAUNCHER_OPEN,
  VIEW_STATE_MAIN_WINDOW_OPEN,
  DEFAULT_HEADER,
} from "./reducerUtils";
import { enLanguagePack } from "../../types/config/PublicConfig";
import { LayoutConfig } from "../../types/config/PublicConfig";

/**
 * Deep merge helper that:
 *  - ignores `undefined` in sources (keeps existing/default),
 *  - replaces arrays wholesale (no index-wise merge),
 *  - otherwise behaves like lodash merge.
 */
function mergeDefaultsDeep<T>(target: Partial<T>, ...sources: Partial<T>[]): T {
  return mergeWith(
    target as any,
    ...(sources as unknown as any[]),
    (objValue: unknown, srcValue: unknown) => {
      if (srcValue === undefined) {
        return objValue;
      }
      if (Array.isArray(objValue) && Array.isArray(srcValue)) {
        // Replace arrays instead of merging by index
        return srcValue.slice();
      }
      // Let mergeWith handle objects/primitives normally
      return undefined;
    },
  ) as T;
}

/**
 * Creates a complete AppConfig with derived values computed from the public config.
 */
function createAppConfig(publicConfig: PublicConfig): AppConfig {
  // Create the theme state with defaults applied and corners computed
  const themeWithDefaults: ThemeState = {
    originalCarbonTheme:
      publicConfig.injectCarbonTheme ?? DEFAULT_THEME_STATE.originalCarbonTheme,
    derivedCarbonTheme:
      publicConfig.injectCarbonTheme ?? DEFAULT_THEME_STATE.derivedCarbonTheme,
    aiEnabled: publicConfig.aiEnabled ?? DEFAULT_THEME_STATE.aiEnabled,
    corners: getThemeCornersType(publicConfig),
  };

  // Compute CSS variable overrides from theme configuration
  const cssVariableOverrides = mergeCSSVariables(
    publicConfig.layout?.customProperties || {},
    {},
    themeWithDefaults.derivedCarbonTheme,
    themeWithDefaults.aiEnabled,
  );

  // Build derived config using deep merge that skips undefined
  const derived = mergeDefaultsDeep(
    {},
    {
      header: DEFAULT_HEADER,
      languagePack: enLanguagePack,
      layout: DEFAULT_LAYOUT_STATE,
      launcher: DEFAULT_LAUNCHER,
    },
    {
      header: publicConfig.header,
      languagePack: publicConfig.strings,
      layout: publicConfig.layout,
      launcher: publicConfig.launcher,
    },
  );

  return {
    public: publicConfig,
    derived: {
      cssVariableOverrides,
      themeWithDefaults,
      header: derived.header,
      languagePack: derived.languagePack as LanguagePack,
      layout: derived.layout,
      launcher: derived.launcher,
    },
  };
}

function createInitialState(config: AppConfig): AppState {
  return {
    // Config with derived values
    config,

    // Messaging state
    ...DEFAULT_MESSAGE_STATE,

    // UI state
    notifications: [],
    suspendScrollDetection: false,
    showNonHeaderBackgroundCover: false,
    isBrowserPageVisible: true,

    // Input state
    botInputState: DEFAULT_INPUT_STATE,

    // Layout/responsive state
    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,

    // Lifecycle state
    isHydrated: false,
    viewChanging: false,
    initialViewChangeComplete: false,
    targetViewState:
      // If openChatByDefault is true we open on first load, otherwise we use the launcher.
      // This will be overwritten by session history if it exists.
      config.public.openChatByDefault
        ? VIEW_STATE_MAIN_WINDOW_OPEN
        : VIEW_STATE_LAUNCHER_OPEN,

    // Session state
    persistedToBrowserStorage: DEFAULT_PERSISTED_TO_BROWSER,

    // Agent UI State
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,

    // Panel states
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,
  };
}

function doCreateStore(
  publicConfig: PublicConfig,
  serviceManager: ServiceManager,
): AppStore<AppState> {
  // Build the complete AppConfig with derived values
  const config = createAppConfig(publicConfig);

  const initialState: AppState = createInitialState(config);

  // Go pre-fill the launcher state from session storage if it exists.
  const sessionStorageState =
    serviceManager.userSessionStorageService?.loadSession();

  if (sessionStorageState) {
    // Use the viewState from session storage as the targetViewState. Note, this overwrites the value that was set for
    // targetViewState above, which took into account if openChatByDefault is true. This overwriting is intentional
    // since we only want those openChatByDefault to open the main window the first time the chat loads for a user.
    // After doCreateStore is finished Chat.startInternal() will try to change the view to this
    // targetViewState.
    initialState.targetViewState = sessionStorageState.viewState;
    // In order to keep the initial view state as the default view state we need to change the session storage
    // view state to the default before replacing the launcher state with the session storage state.
    sessionStorageState.viewState = VIEW_STATE_ALL_CLOSED;
    // Replace the launcher state with the session storage state.
    initialState.persistedToBrowserStorage = {
      ...initialState.persistedToBrowserStorage,
      ...sessionStorageState,
      disclaimersAccepted: {
        ...initialState.persistedToBrowserStorage.disclaimersAccepted,
        ...sessionStorageState?.disclaimersAccepted,
      },
      homeScreenState: {
        ...initialState.persistedToBrowserStorage.homeScreenState,
        ...sessionStorageState?.homeScreenState,
      },
      humanAgentState: {
        ...initialState.persistedToBrowserStorage.humanAgentState,
        ...sessionStorageState?.humanAgentState,
        responseUserProfiles: {
          ...initialState.persistedToBrowserStorage.humanAgentState
            .responseUserProfiles,
          ...sessionStorageState?.humanAgentState?.responseUserProfiles,
        },
      },
    };
  }

  return createAppStore(reducerFunction, initialState);
}

/**
 * Returns the corner type for the Carbon AI Chat widget.
 */
function getThemeCornersType(publicConfig: PublicConfig) {
  if (
    getLayoutState(publicConfig).showFrame === false ||
    IS_PHONE ||
    publicConfig.layout?.corners === CornersType.SQUARE
  ) {
    return CornersType.SQUARE;
  }

  return DEFAULT_THEME_STATE.corners;
}

function getLayoutState(publicConfig: PublicConfig): LayoutConfig {
  // Use the same deep merge semantics for layout specifically
  return mergeDefaultsDeep<LayoutConfig>(
    {},
    DEFAULT_LAYOUT_STATE,
    publicConfig.layout ?? {},
  );
}

/**
 * This is the global reducer for the redux store. It will use the map of reducers from the "reducers" array to map
 * the action type to the sub-reducer for that specific action.
 */
function reducerFunction(
  state: AppState,
  action: { type: string; [key: string]: unknown } | undefined,
): AppState {
  return action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;
}

export { doCreateStore, createAppConfig, createInitialState };
