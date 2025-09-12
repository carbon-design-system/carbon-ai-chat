/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { VIEW_STATE_ALL_CLOSED } from "../store/reducerUtils";
import { AppState, ViewState, ViewType } from "../../types/state/AppState";

/**
 * Take a newView, either in string format or as a partial {@link ViewState}, and combine it with the current viewState
 * to form a complete view state that is then returned.
 */
function constructViewState(
  newView: ViewType | Partial<ViewState>,
  appState: AppState,
): ViewState {
  const { viewState } = appState.persistedToBrowserStorage;

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

export { constructViewState };
