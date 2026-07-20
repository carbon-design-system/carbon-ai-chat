/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ViewState } from "../instance/apiTypes";
import ObjectMap from "../utilities/ObjectMap";
import { HomeScreenState } from "../config/HomeScreenConfig";
import { PersistedHumanAgentState } from "./PersistedHumanAgentState";

/**
 * Items stored in sessionStorage.
 *
 * @category Instance
 */
interface PersistedState {
  /**
   * Indicates if this state was loaded from browser session storage or if was created as part of a new session.
   */
  wasLoadedFromBrowser: boolean;

  /**
   * The version of the Carbon AI Chat that this data is persisted for. If there are any breaking changes to the
   * application state and a user reloads and gets a new version of the widget, bad things might happen so we'll
   * just invalidate the persisted storage if we ever attempt to load an old version on Carbon AI Chat startup.
   */
  version: string;

  /**
   * Indicates which of the Carbon AI Chat views are visible and which are hidden.
   */
  viewState: ViewState;

  /**
   * Indicates if we should show an unread indicator on the launcher. This is set by
   * {@link ChatInstance.updateAssistantUnreadIndicatorVisibility} and will display an empty circle on
   * the launcher. This setting is overridden if there are any unread human agent messages in which case a circle
   * with a number is displayed.
   */
  showUnreadIndicator: boolean;

  /**
   * Indicates if the launcher should be in the expanded state.
   */
  launcherIsExpanded: boolean;

  /**
   * Determines if the launcher should start a timer to show its expanded state.
   */
  launcherShouldStartCallToActionCounterIfEnabled: boolean;

  /**
   * If the user has received a message beyond the welcome node. We use this to mark if the chat has been interacted
   * with. This flag is duplicated so the information is available before hydration and before the user is known.
   * Note that this property reflects only the last user and should only be used when an approximate value is
   * acceptable.
   */
  hasSentNonWelcomeMessage: boolean;

  /**
   * Map of if a disclaimer has been accepted on a given window.hostname value, keyed by hostname via
   * {@link ObjectMap}.
   */
  disclaimersAccepted: ObjectMap<boolean>;

  /**
   * State of home screen.
   */
  homeScreenState: HomeScreenState;

  /**
   * The persisted subset of the human agent state.
   */
  humanAgentState: PersistedHumanAgentState;
}

export type { PersistedState };
