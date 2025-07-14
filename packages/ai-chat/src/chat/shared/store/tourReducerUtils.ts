/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageResponse } from "../../../types/messaging/Messages";
import { AppState } from "../../../types/state/AppState";

/**
 * When the message history is being hydrated and there was an active tour, or when starting a tour, populate the tour
 * step items. If the message with the tour data can not be found, or there is no activeTourID, clear all the existing
 * tour data.
 */
function populateTourStepItems(state: AppState): AppState {
  const { activeTourID } =
    state.persistedToBrowserStorage.chatState.persistedTourState;

  if (activeTourID) {
    // If there's an activeTourID find the originalMessage that contains a localMessage that triggered the current
    // active tour.
    const originalMessage = state.allMessagesByID[activeTourID];

    // Find the GenericItem within the originalMessage that has the active tour data.
    const tourMessageItem = (
      originalMessage as MessageResponse
    )?.output?.generic?.find((message) => Boolean(message.user_defined?.steps));

    if (tourMessageItem) {
      // Populate the tourState now that we have the active tour data.
      return {
        ...state,
        tourState: {
          ...state.tourState,
          activeTourStepItems: tourMessageItem.user_defined?.steps as any,
        },
      };
    }
  }
  // If the message with the tour data can not be found, or there is no activeTourID, clear all the existing tour data.
  return clearTourState(state);
}

/**
 * Clear all tour state.
 */
function clearTourState(state: AppState): AppState {
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      chatState: {
        ...state.persistedToBrowserStorage.chatState,
        persistedTourState: {
          activeTourID: null,
          activeTourCurrentStepIndex: null,
        },
      },
      launcherState: {
        ...state.persistedToBrowserStorage.launcherState,
        activeTour: false,
      },
    },
    tourState: {
      ...state.tourState,
      activeTourStepItems: null,
    },
  };
}
export { populateTourStepItems, clearTourState };
