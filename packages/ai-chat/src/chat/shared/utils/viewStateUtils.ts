/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { VIEW_STATE_ALL_CLOSED } from "../store/reducerUtils";
import { AppState, ViewState, ViewType } from "../../../types/state/AppState";
import { consoleError } from "./miscUtils";

/**
 * Take a newView, either in string format or as a partial {@link ViewState}, and combine it with the current viewState
 * to form a complete view state that is then returned.
 */
function constructViewState(
  newView: ViewType | Partial<ViewState>,
  appState: AppState
): ViewState {
  const { viewState } = appState.persistedToBrowserStorage.launcherState;

  // Start with the existing view state.
  let newViewState: ViewState;

  // Depending on the type of newView go through different steps to construct a new viewState.
  if (typeof newView === "string") {
    // If the newView is of type string then set all the views to false except for the view of the provided string
    // which should be true.
    newViewState = { ...VIEW_STATE_ALL_CLOSED, [newView]: true };
  } else {
    // If the newView is not a string then merge the newView with the existing viewState. This will cause any views
    // provided in newView to overwrite the existing view state, while preserving the view state of any views not
    // included in the newView.
    newViewState = { ...viewState, ...newView };
  }

  return newViewState;
}

/**
 * Take a viewState and validate that it makes sense against other pieces of state. For example, we only want to show a
 * tour if there is a tour to be shown. If the validation fails then false will be returned, otherwise true will be.
 */
function validateViewState(viewState: ViewState, appState: AppState): boolean {
  const { activeTour } = appState.persistedToBrowserStorage.launcherState;

  if (viewState.tour && !activeTour) {
    // If the new viewState is supposed to show a tour, but there is no active tour, then log an error and return false.
    consoleError(
      "Error changing the view. The new view was supposed to show a tour however there is no active tour to show." +
        " Changing the view has been canceled."
    );
    return false;
  }

  return true;
}

export { constructViewState, validateViewState };
