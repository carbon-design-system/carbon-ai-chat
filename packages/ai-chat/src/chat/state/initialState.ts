/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig } from '../../types/config/PublicConfig';
import type { DerivedConfig } from '../../types/state/AppConfig';
import { createDerivedConfig } from '../utils/appConfig';
import type {
  ViewPartitionState,
  ViewPersistedState,
} from '../../types/state/ViewPartitionState';
import {
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_LAUNCHER_OPEN,
  VIEW_STATE_MAIN_WINDOW_OPEN,
} from './defaults';
import { createDefaultViewPersistedState } from './persisted';

/**
 * Restores the saved view half over the defaults. The saved window state
 * becomes the target the chat opens to, and the stored one starts closed until
 * that change runs.
 */
function restoreViewPersistedState(
  saved: ViewPersistedState
): ViewPersistedState {
  const defaults = createDefaultViewPersistedState();
  return {
    ...defaults,
    ...saved,
    viewState: { ...VIEW_STATE_ALL_CLOSED },
    // We only bother to show this on initial page load, so if we are getting something from session storage,
    // we set it to false.
    launcherShouldStartCallToActionCounterIfEnabled: false,
    disclaimersAccepted: {
      ...defaults.disclaimersAccepted,
      ...saved.disclaimersAccepted,
    },
    homeScreenState: {
      ...defaults.homeScreenState,
      ...saved.homeScreenState,
    },
  };
}

/**
 * The view partition's first value, from the host's config and the saved view
 * half, if a session was saved. Boot passes the values it already derived from
 * the config, so they're computed once.
 */
function createInitialViewState(
  config: PublicConfig,
  saved: ViewPersistedState | null,
  derivedConfig: DerivedConfig = createDerivedConfig(config)
): ViewPartitionState {
  const persistedToBrowserStorage = saved
    ? restoreViewPersistedState(saved)
    : createDefaultViewPersistedState();
  if (typeof config.launcher?.showUnreadIndicator === 'boolean') {
    persistedToBrowserStorage.showUnreadIndicator =
      config.launcher.showUnreadIndicator;
  }

  return {
    catastrophicErrorType: undefined,
    catastrophicErrorPanelState: undefined,
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    workspacePanelState: DEFAULT_WORKSPACE_PANEL_STATE,
    historyPanelState: {
      ...DEFAULT_HISTORY_PANEL_STATE,
      // If startClosed is true, start closed everywhere
      // Otherwise, start open (will be adjusted by mobile detection)
      isOpen: config.history?.startClosed ? false : true,
    },
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,

    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,
    viewChanging: false,
    initialViewChangeComplete: false,
    // A saved session reopens where it was. Otherwise, openChatByDefault opens the main window on first load.
    targetViewState: saved
      ? saved.viewState
      : config.openChatByDefault
        ? VIEW_STATE_MAIN_WINDOW_OPEN
        : VIEW_STATE_LAUNCHER_OPEN,
    showNonHeaderBackgroundCover: false,
    suspendScrollDetection: false,
    isBrowserPageVisible: true,

    announceMessage: undefined,
    // Set from the `markdown` prop; `undefined` when the host omits it.
    markdownConfig: undefined,
    derivedConfig,

    isMessageLoadingCounter: 0,
    isMessageLoadingText: undefined,
    isHydratingCounter: 0,
    numUnreadMessages: 0,

    persistedToBrowserStorage,
  };
}

export { createInitialViewState };
