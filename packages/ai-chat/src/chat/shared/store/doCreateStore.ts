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

import { NODE_ENV } from "../environmentVariables";
import { ServiceManager } from "../services/ServiceManager";
import { AppConfig } from "../../../types/state/AppConfig";
import { AppState, ThemeState } from "../../../types/state/AppState";
import { IS_PHONE } from "../utils/browserUtils";
import { CornersType } from "../utils/constants";
import { withoutEmptyStarters } from "../utils/homeScreenUtils";
import { getBotName } from "../utils/miscUtils";
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
import { enLanguagePack } from "../../../types/instance/apiTypes";
import { LayoutConfig } from "../../../types/config/PublicConfig";

function doCreateStore(
  config: AppConfig,
  serviceManager: ServiceManager
): Store<AppState> {
  // Determine the value for useAITheme.
  let useAITheme;
  if (config.public.themeConfig?.useAITheme !== undefined) {
    // If a value is set in the public config then use that.
    useAITheme = config.public.themeConfig?.useAITheme;
  } else {
    // If neither config is setting a value than use the default.
    useAITheme = DEFAULT_THEME_STATE.useAITheme;
  }

  // The theme state uses a default for each property which can be overridden by the public config if specified. If a
  // value for the property is not specified in the public config, then the default can be overridden by the remote
  // config.
  const themeState: ThemeState = {
    carbonTheme:
      config.public.themeConfig?.carbonTheme || DEFAULT_THEME_STATE.carbonTheme,
    useAITheme,
    corners: getThemeCornersType(config),
  };

  const botName = getBotName(themeState.useAITheme, config);

  const initialState: AppState = {
    ...DEFAULT_MESSAGE_STATE,
    notifications: [],
    botInputState: {
      ...DEFAULT_INPUT_STATE(),
      isReadonly: config.public.isReadonly,
      fieldVisible: !config.public.isReadonly,
    },
    humanAgentState: { ...DEFAULT_HUMAN_AGENT_STATE },
    botName,
    headerDisplayName: null,
    botAvatarURL: config.public.botAvatarURL || null,
    headerAvatarConfig: null,
    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,
    // Any IBM set variables will override variables coming from remote. We keep this in redux so we can track the
    // current state of the theming variables as they are updated and merged at different times.
    cssVariableOverrides: mergeCSSVariables(
      {},
      {},
      themeState.carbonTheme,
      themeState.useAITheme
    ),
    isHydrated: false,
    // The language pack will start as English. If a different language pack is provided or updated, it will be
    // merged in with a redux action.
    languagePack: enLanguagePack,
    locale: "en",
    config,
    originalConfig: config,
    suspendScrollDetection: false,
    homeScreenConfig: withoutEmptyStarters({}),
    persistedToBrowserStorage: {
      ...DEFAULT_PERSISTED_TO_BROWSER,
      chatState: {
        ...DEFAULT_PERSISTED_TO_BROWSER.chatState,
        homeScreenState: {
          ...DEFAULT_PERSISTED_TO_BROWSER.chatState.homeScreenState,
        },
      },
    },
    launcher: merge({}, DEFAULT_LAUNCHER, {
      config: merge(
        {},
        {},
        {
          mobile: {},
        },
        { is_on: config.public.showLauncher }
      ),
    }),
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    isDestroyed: false,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    viewChanging: false,
    initialViewChangeComplete: false,
    targetViewState:
      // If openChatByDefault is set to true then the Carbon AI Chat should open automatically. This value will be overridden
      // by session history if a session exists. This overwriting is intentional since we only want openChatByDefault to
      // open the main window the first time the chat loads for a user.
      config.public.openChatByDefault
        ? VIEW_STATE_MAIN_WINDOW_OPEN
        : VIEW_STATE_LAUNCHER_OPEN,
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,
    customMenuOptions: null,
    isBrowserPageVisible: true,
    showNonHeaderBackgroundCover: false,
    theme: themeState,
    layout: getLayoutState(config),
    chatHeaderState: {
      config: null,
    },
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
    config.public.debug || NODE_ENV === "development"
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
function getThemeCornersType(config: AppConfig) {
  if (
    getLayoutState(config).showFrame === false ||
    IS_PHONE ||
    config.public.themeConfig?.corners === CornersType.SQUARE
  ) {
    return CornersType.SQUARE;
  }

  return DEFAULT_THEME_STATE.corners;
}

function getLayoutState(config: AppConfig): LayoutConfig {
  if (config.public.themeConfig?.useAITheme) {
    return {
      showFrame: config.public.layout?.showFrame ?? true,
      hasContentMaxWidth: config.public.layout?.hasContentMaxWidth ?? true,
    };
  }

  return merge({}, DEFAULT_LAYOUT_STATE, config.public.layout);
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

export { doCreateStore };
