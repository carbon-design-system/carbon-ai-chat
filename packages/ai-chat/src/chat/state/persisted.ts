/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { VERSION } from '../../sdk/utils/environmentVariables';
import type { ConversationPersistedState } from '../../types/state/AppState';
import type { PersistedState } from '../../types/state/PersistedState';
import type { ViewPersistedState } from '../../types/state/ViewPartitionState';
import { VIEW_STATE_ALL_CLOSED } from './defaults';

/** A fresh default for the view half of saved state. */
function createDefaultViewPersistedState(): ViewPersistedState {
  return {
    disclaimersAccepted: {},
    homeScreenState: {
      isHomeScreenOpen: false,
      showBackToAssistant: false,
    },
    wasLoadedFromBrowser: false,
    version: VERSION,
    viewState: { ...VIEW_STATE_ALL_CLOSED },
    showUnreadIndicator: false,
    launcherIsExpanded: false,
    launcherShouldStartCallToActionCounterIfEnabled: true,
  };
}

/** The view half of a saved session: everything the conversation doesn't save. */
function viewHalfOf(saved: PersistedState): ViewPersistedState {
  const {
    humanAgentState: _humanAgentState,
    hasSentNonWelcomeMessage: _hasSentNonWelcomeMessage,
    ...view
  } = saved;
  return view;
}

/**
 * Joins the two halves back into the saved session the host and session
 * storage see. The wire shape and key order stay as they were.
 */
function joinPersistedState(
  conversation: ConversationPersistedState,
  view: ViewPersistedState
): PersistedState {
  return {
    disclaimersAccepted: view.disclaimersAccepted,
    homeScreenState: view.homeScreenState,
    humanAgentState: conversation.humanAgentState,
    hasSentNonWelcomeMessage: conversation.hasSentNonWelcomeMessage,
    wasLoadedFromBrowser: view.wasLoadedFromBrowser,
    version: view.version,
    viewState: view.viewState,
    showUnreadIndicator: view.showUnreadIndicator,
    launcherIsExpanded: view.launcherIsExpanded,
    launcherShouldStartCallToActionCounterIfEnabled:
      view.launcherShouldStartCallToActionCounterIfEnabled,
  };
}

export { createDefaultViewPersistedState, joinPersistedState, viewHalfOf };
