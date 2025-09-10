/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from "lodash-es/merge.js";
import { createStore, Store } from "redux";
import { NODE_ENV } from "../utils/environmentVariables";
import { ServiceManager } from "../services/ServiceManager";
import { AppConfig } from "../../types/state/AppConfig";
import { AppState, ThemeState } from "../../types/state/AppState";
import { IS_PHONE } from "../utils/browserUtils";
import { CornersType } from "../utils/constants";
import { PublicConfig } from "../../types/config/PublicConfig";
import { mergeCSSVariables } from "../utils/styleUtils";
import { reducers } from "./reducers";
import {
  DEFAULT_HUMAN_AGENT_STATE,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_INPUT_STATE,
  DEFAULT_LAUNCHER,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_THEME_STATE,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_LAUNCHER_OPEN,
  VIEW_STATE_MAIN_WINDOW_OPEN,
} from "./reducerUtils";
import { enLanguagePack } from "../../types/config/PublicConfig";
import { LayoutConfig } from "../../types/config/PublicConfig";

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
    (publicConfig.layout?.["custom-properties"] as any) || {},
    {},
    themeWithDefaults.derivedCarbonTheme,
    themeWithDefaults.aiEnabled,
  );

  return {
    public: publicConfig,
    derived: {
      cssVariableOverrides,
      themeWithDefaults,
    },
  };
}

function doCreateStore(
  publicConfig: PublicConfig,
  serviceManager: ServiceManager,
): Store<AppState> {
  // Build the complete AppConfig with derived values
  const config = createAppConfig(publicConfig);

  const initialState: AppState = {
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
    botInputState: {
      ...DEFAULT_INPUT_STATE(),
      isReadonly: config.public.isReadonly || false,
    },

    // Agent state
    humanAgentState: { ...DEFAULT_HUMAN_AGENT_STATE },

    // Layout/responsive state
    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,
    layout: getLayoutState(publicConfig),

    // Lifecycle state
    isHydrated: false,
    viewChanging: false,
    initialViewChangeComplete: false,
    targetViewState:
      // If openChatByDefault is set to true then the Carbon AI Chat should open automatically. This value will be overridden
      // by session history if a session exists. This overwriting is intentional since we only want openChatByDefault to
      // open the main window the first time the chat loads for a user.
      config.public.openChatByDefault
        ? VIEW_STATE_MAIN_WINDOW_OPEN
        : VIEW_STATE_LAUNCHER_OPEN,

    // Language state
    languagePack: enLanguagePack,

    // Session state
    persistedToBrowserStorage: {
      ...DEFAULT_PERSISTED_TO_BROWSER,
      chatState: {
        ...DEFAULT_PERSISTED_TO_BROWSER.chatState,
        homeScreenState: {
          ...DEFAULT_PERSISTED_TO_BROWSER.chatState.homeScreenState,
        },
      },
    },

    // Launcher state
    launcher: merge({}, DEFAULT_LAUNCHER, {
      config: merge(
        {},
        {},
        {
          mobile: {},
        },
        config.public.launcher || {},
      ),
    }),

    // Panel states
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,
  };

  // Go pre-fill the launcher state from session storage if it exists.
  const sessionStorageLauncherState =
    serviceManager.userSessionStorageService?.loadLauncherSession();

  if (sessionStorageLauncherState) {
    // Use the viewState from session storage as the targetViewState. Note, this overwrites the value that was set for
    // targetViewState above, which took into account if openChatByDefault is true. This overwriting is intentional
    // since we only want those openChatByDefault to open the main window the first time the chat loads for a user.
    // After doCreateStore is finished Chat.startInternal() will try to change the view to this
    // targetViewState.
    initialState.targetViewState = sessionStorageLauncherState.viewState;
    // In order to keep the initial view state as the default view state we need to change the session storage
    // view state to the default before replacing the launcher state with the session storage state.
    sessionStorageLauncherState.viewState = VIEW_STATE_ALL_CLOSED;
    // Replace the launcher state with the session storage state.
    initialState.persistedToBrowserStorage.launcherState =
      sessionStorageLauncherState;
  }

  const enhancer =
    publicConfig.debug || NODE_ENV === "development"
      ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
        (window as any).__REDUX_DEVTOOLS_EXTENSION__({
          name: "CarbonAIChat",
          instanceId: `Chat${serviceManager.namespace.suffix}`,
        })
      : undefined;

  return createStore(reducerFunction, initialState as any, enhancer);
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
  if (publicConfig.aiEnabled ?? true) {
    return {
      showFrame: publicConfig.layout?.showFrame ?? true,
      hasContentMaxWidth: publicConfig.layout?.hasContentMaxWidth ?? true,
    };
  }

  return merge({}, DEFAULT_LAYOUT_STATE, publicConfig.layout);
}

/**
 * This is the global reducer for the redux store. It will use the map of reducers from the "reducers" array to map
 * the action type to the sub-reducer for that specific action.
 */
function reducerFunction(state: AppState, action?: any): AppState {
  return action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;
}

export { doCreateStore, createAppConfig };
