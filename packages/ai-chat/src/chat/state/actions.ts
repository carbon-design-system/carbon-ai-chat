/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Actions for the view partition. Only the prebuilt chat dispatches them;
 * conversation code reaches the view through its ports instead.
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import type { AnnounceMessage } from '../../types/state/AnnounceMessage';
import type { DerivedConfig } from '../../types/state/AppConfig';
import type { ThemeState } from '../../types/state/ThemeState';
import type { ViewPartitionState } from '../../types/state/ViewPartitionState';
import type { CatastrophicErrorPanelState } from '../../types/state/panels/CatastrophicErrorPanelState';
import type { PersistedState } from '../../types/state/PersistedState';
import type {
  CustomPanelConfigOptions,
  ViewState,
  WorkspaceCustomPanelConfigOptions,
} from '../../types/instance/apiTypes';
import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type {
  ConversationalSearchItemCitation,
  IFrameItem,
  Message,
  SearchResult,
} from '../../types/messaging/Messages';

const SET_VIEW_VALUE = 'SET_VIEW_VALUE';
const SET_DERIVED_CONFIG = 'SET_DERIVED_CONFIG';
const UPDATE_THEME_STATE = 'UPDATE_THEME_STATE';
const RESET_IS_LOADING_COUNTER = 'RESET_IS_LOADING_COUNTER';
const ADD_IS_LOADING_COUNTER = 'ADD_IS_LOADING_COUNTER';
const RESET_IS_HYDRATING_COUNTER = 'RESET_IS_HYDRATING_COUNTER';
const ADD_IS_HYDRATING_COUNTER = 'ADD_IS_HYDRATING_COUNTER';
const UPDATE_CATASTROPHIC_ERROR_PANEL = 'UPDATE_CATASTROPHIC_ERROR_PANEL';
const SET_VIEW_STATE = 'SET_VIEW_STATE';
const SET_VIEW_CHANGING = 'SET_VIEW_CHANGING';
const SET_INITIAL_VIEW_CHANGE_COMPLETE = 'SET_INITIAL_VIEW_CHANGE_COMPLETE';
const ANNOUNCE_MESSAGE = 'ANNOUNCE_MESSAGE';
const ACCEPTED_DISCLAIMER = 'ACCEPTED_DISCLAIMER';
const SET_HOME_SCREEN_IS_OPEN = 'SET_HOME_SCREEN_IS_OPEN';
const TOGGLE_HOME_SCREEN = 'GO_BACK_TO_HOME';
const SET_LAUNCHER_PROPERTY = 'SET_LAUNCHER_PROPERTY';
const SET_LAUNCHER_MINIMIZED = 'SET_LAUNCHER_MINIMIZED';
const OPEN_IFRAME_CONTENT = 'OPEN_IFRAME_CONTENT';
const CLOSE_IFRAME_PANEL = 'CLOSE_IFRAME_PANEL';
const SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN =
  'SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN';
const SET_CUSTOM_PANEL_OPEN = 'SET_CUSTOM_PANEL_OPEN';
const SET_CUSTOM_PANEL_OPTIONS = 'SET_CUSTOM_PANEL_OPTIONS';
const SET_WORKSPACE_PANEL_OPEN = 'SET_WORKSPACE_PANEL_OPEN';
const SET_WORKSPACE_PANEL_OPTIONS = 'SET_WORKSPACE_PANEL_OPTIONS';
const SET_WORKSPACE_PANEL_DATA = 'SET_WORKSPACE_PANEL_DATA';
const SET_HISTORY_PANEL_OPEN = 'SET_HISTORY_PANEL_OPEN';
const SET_HISTORY_PANEL_OPTIONS = 'SET_HISTORY_PANEL_OPTIONS';
const SET_IS_BROWSER_PAGE_VISIBLE = 'SET_IS_PAGE_VISIBLE';
const SET_RESPONSE_PANEL_IS_OPEN = 'SET_RESPONSE_PANEL_IS_OPEN';
const SET_RESPONSE_PANEL_CONTENT = 'SET_PANEL_RESPONSE_CONTENT';

interface SetWorkspacePanelOptionsAction {
  type: typeof SET_WORKSPACE_PANEL_OPTIONS;
  options: Partial<WorkspaceCustomPanelConfigOptions>;
  [key: string]: unknown;
}

interface SetWorkspacePanelDataAction {
  type: typeof SET_WORKSPACE_PANEL_DATA;
  workspaceID?: string;
  localMessageItem?: LocalMessageItem;
  fullMessage?: Message;
  additionalData?: unknown;
  [key: string]: unknown;
}

const viewActions = {
  /** Sets one top-level value of the view partition. */
  setViewValue<TKey extends keyof ViewPartitionState>(
    key: TKey,
    value: ViewPartitionState[TKey]
  ) {
    return { type: SET_VIEW_VALUE, key, value };
  },

  /**
   * Replaces the values derived from the config. Each top-level value equal to
   * the stored one keeps its reference, so its readers don't rerun.
   */
  setDerivedConfig(derivedConfig: DerivedConfig) {
    return { type: SET_DERIVED_CONFIG, derivedConfig };
  },

  /** Sets the theme, as the theme watcher resolves an inherited one. */
  updateThemeState(themeState: ThemeState) {
    return { type: UPDATE_THEME_STATE, themeState };
  },

  updateCatastrophicErrorPanel(
    panelState: Partial<CatastrophicErrorPanelState>
  ) {
    return {
      type: UPDATE_CATASTROPHIC_ERROR_PANEL,
      panelState,
    };
  },
  addIsLoadingCounter(addToIsLoading: number, message?: string) {
    return {
      type: ADD_IS_LOADING_COUNTER,
      addToIsLoading,
      message,
    };
  },
  resetIsLoadingCounter() {
    return {
      type: RESET_IS_LOADING_COUNTER,
    };
  },
  resetIsHydratingCounter() {
    return {
      type: RESET_IS_LOADING_COUNTER,
    };
  },
  addIsHydratingCounter(addToIsHydrating: number) {
    return {
      type: ADD_IS_HYDRATING_COUNTER,
      addToIsHydrating,
    };
  },
  setViewState(viewState: ViewState) {
    return { type: SET_VIEW_STATE, viewState };
  },
  setViewChanging(viewChanging: boolean) {
    return { type: SET_VIEW_CHANGING, viewChanging };
  },
  setInitialViewChangeComplete(changeComplete: boolean) {
    return { type: SET_INITIAL_VIEW_CHANGE_COMPLETE, changeComplete };
  },
  /**
   * Sets the value of one of the properties of {@link PersistedState}.
   */
  setLauncherProperty<TPropertyName extends keyof PersistedState>(
    propertyName: TPropertyName,
    propertyValue: PersistedState[TPropertyName]
  ) {
    return { type: SET_LAUNCHER_PROPERTY, propertyName, propertyValue };
  },
  /**
   * Sets the given message as the current accessibility announcement so that it will immediately be read by a
   * screen reader.
   */
  announceMessage(message: AnnounceMessage) {
    return { type: ANNOUNCE_MESSAGE, message };
  },
  /**
   * Sets the disclaimer state for the current domain to true.
   */
  acceptDisclaimer() {
    return { type: ACCEPTED_DISCLAIMER };
  },
  /**
   * For toggling Home Screen open state.
   */
  setHomeScreenIsOpen(isOpen: boolean) {
    return { type: SET_HOME_SCREEN_IS_OPEN, isOpen };
  },
  setLauncherMinimized() {
    return { type: SET_LAUNCHER_MINIMIZED };
  },
  closeIFramePanel() {
    return { type: CLOSE_IFRAME_PANEL };
  },
  setIFrameContent(messageItem: IFrameItem) {
    return { type: OPEN_IFRAME_CONTENT, messageItem };
  },
  setViewSourcePanelIsOpen(
    isOpen: boolean,
    citationItem?: ConversationalSearchItemCitation,
    relatedSearchResult?: SearchResult
  ) {
    return {
      type: SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
      isOpen,
      citationItem,
      relatedSearchResult,
    };
  },
  setCustomPanelConfigOptions(options: CustomPanelConfigOptions) {
    return { type: SET_CUSTOM_PANEL_OPTIONS, options };
  },
  setCustomPanelOpen(isOpen: boolean) {
    return { type: SET_CUSTOM_PANEL_OPEN, isOpen };
  },
  setWorkspaceCustomPanelConfigOptions(
    options: Partial<WorkspaceCustomPanelConfigOptions>
  ): SetWorkspacePanelOptionsAction {
    return {
      type: SET_WORKSPACE_PANEL_OPTIONS,
      options,
    };
  },
  setWorkspaceCustomPanelOpen(isOpen: boolean) {
    return { type: SET_WORKSPACE_PANEL_OPEN, isOpen };
  },
  setWorkspacePanelData(data: {
    workspaceID?: string;
    localMessageItem?: LocalMessageItem;
    fullMessage?: Message;
    additionalData?: unknown;
  }): SetWorkspacePanelDataAction {
    return {
      type: SET_WORKSPACE_PANEL_DATA,
      workspaceID: data.workspaceID,
      localMessageItem: data.localMessageItem,
      fullMessage: data.fullMessage,
      additionalData: cloneDeep(data.additionalData),
    };
  },
  setHistoryPanelOpen(isOpen: boolean) {
    return { type: SET_HISTORY_PANEL_OPEN, isOpen };
  },
  setHistoryPanelOptions(isMobile: boolean, isOpen?: boolean) {
    return { type: SET_HISTORY_PANEL_OPTIONS, isMobile, isOpen };
  },
  /**
   * Switches between the bot and home screen views.
   */
  toggleHomeScreen() {
    return { type: TOGGLE_HOME_SCREEN };
  },
  /**
   * Changes the values that indicates whether the browser page is visible.
   */
  setIsBrowserPageVisible(isVisible: boolean) {
    return { type: SET_IS_BROWSER_PAGE_VISIBLE, isVisible };
  },
  setResponsePanelIsOpen(isOpen: boolean) {
    return { type: SET_RESPONSE_PANEL_IS_OPEN, isOpen };
  },
  setResponsePanelContent(
    localMessageItem: LocalMessageItem,
    isMessageForInput = false
  ) {
    return {
      type: SET_RESPONSE_PANEL_CONTENT,
      localMessageItem,
      isMessageForInput,
    };
  },
};

export default viewActions;
export {
  SET_VIEW_VALUE,
  SET_DERIVED_CONFIG,
  UPDATE_THEME_STATE,
  RESET_IS_LOADING_COUNTER,
  ADD_IS_LOADING_COUNTER,
  RESET_IS_HYDRATING_COUNTER,
  ADD_IS_HYDRATING_COUNTER,
  UPDATE_CATASTROPHIC_ERROR_PANEL,
  SET_VIEW_STATE,
  SET_VIEW_CHANGING,
  SET_INITIAL_VIEW_CHANGE_COMPLETE,
  ANNOUNCE_MESSAGE,
  ACCEPTED_DISCLAIMER,
  SET_HOME_SCREEN_IS_OPEN,
  TOGGLE_HOME_SCREEN,
  SET_LAUNCHER_PROPERTY,
  SET_LAUNCHER_MINIMIZED,
  OPEN_IFRAME_CONTENT,
  CLOSE_IFRAME_PANEL,
  SET_CONVERSATIONAL_SEARCH_CITATION_PANEL_IS_OPEN,
  SET_CUSTOM_PANEL_OPEN,
  SET_CUSTOM_PANEL_OPTIONS,
  SET_WORKSPACE_PANEL_OPEN,
  SET_WORKSPACE_PANEL_OPTIONS,
  SET_WORKSPACE_PANEL_DATA,
  SET_HISTORY_PANEL_OPEN,
  SET_HISTORY_PANEL_OPTIONS,
  SET_IS_BROWSER_PAGE_VISIBLE,
  SET_RESPONSE_PANEL_IS_OPEN,
  SET_RESPONSE_PANEL_CONTENT,
};
