/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";

import { ServiceManager } from "./ServiceManager";
import actions from "../store/actions";
import { debugLog } from "../utils/miscUtils";
import { deepFreeze } from "../utils/lang/objectUtils";
import { constructViewState } from "../utils/viewStateUtils";
import { ViewState, ViewType } from "../../types/state/AppState";
import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  MainWindowCloseReason,
  MainWindowOpenReason,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";

/**
 * Service responsible for managing view state transitions and firing view change events.
 */
export class ViewStateService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Construct the newViewState from the newView provided. Fire the view:pre:change and view:change events, as well as
   * window:pre:open, window:open, or window:pre:close, window:close if instructed to do so. If the view change isn't
   * canceled by the events then change the view. If the main window is open after changing the view, and
   * doNotHydrate isn't true and the chat is not already hydrated, then hydrate the chat.
   */
  async changeView(
    newView: ViewType | Partial<ViewState>,
    reason: {
      viewChangeReason?: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
    tryHydrating = true,
    forceViewChange = false,
  ): Promise<ViewState> {
    const { store } = this.serviceManager;
    const { viewState } = store.getState().persistedToBrowserStorage;

    // Build the new viewState object.
    let newViewState = constructViewState(newView, store.getState());

    if (!isEqual(newViewState, viewState) || forceViewChange) {
      // If the newViewState is different from the current viewState, or the viewChange is being forced to happen, fire
      // the view:change events and change which views are visible.
      await this.fireViewChangeEventsAndChangeView(newViewState, reason);

      // Check and see if the chat should be hydrated.
      newViewState = store.getState().persistedToBrowserStorage.viewState;
      if (
        tryHydrating &&
        newViewState.mainWindow &&
        !store.getState().isHydrated
      ) {
        // If it's ok to hydrate, the main window is now visible, and the chat isn't hydrated, then hydrate
        // the chat. Since this function is only responsible for changing the view don't await hydrateChat(), instead
        // let hydrateChat complete on its own time.
        this.serviceManager.hydrationService.hydrateChat().catch((error) => {
          debugLog("Error hydrating the chat", error);
        });
      }
    }

    // Return the newViewState. This could be the same as the original viewState if there was no difference between the
    // original viewState and the proposed newViewState, or it could be an updated viewState. The updated viewState
    // could be what was originally sent to fireViewChangeEventsAndChangeView, or it could be a viewState that has been
    // modified by Deb during the view:pre:change event.
    return newViewState;
  }

  /**
   * Fire the "view:pre:change" and "view:change" events. This will return a boolean to indicate if the process was
   * cancelled and the view should remain unchanged. If the view change isn't canceled by the events then this will
   * switch to the newViewState that's been provided. This method is private to force the use of the changeView method
   * above as an entry point to this method.
   *
   * The flow of this method:
   * 1. Guards against concurrent view changes and sets the viewChanging flag
   * 2. Fires the pre-change event, allowing cancellation and view state modifications
   * 3. Updates the store with the new view state
   * 4. Fires the post-change event, allowing rollback and final view state modifications
   * 5. Ensures the viewChanging flag is cleared in the finally block
   *
   * @returns True to indicate that the view was changed. False indicates the view change was cancelled.
   */
  private async fireViewChangeEventsAndChangeView(
    newViewState: ViewState,
    reason: {
      viewChangeReason?: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
  ): Promise<void> {
    const { store } = this.serviceManager;

    if (store.getState().viewChanging) {
      // If the view is already in the middle of changing then throw an error.
      throw new Error(
        "The view may not be changed while a view change event is already running. Please make sure to resolve any promises from these events.",
      );
    }

    store.dispatch(actions.setViewChanging(true));

    const { viewState } = store.getState().persistedToBrowserStorage;
    // If we have a mainWindowOpenReason or mainWindowCloseReason then this viewChangeReason will be determined lower down.
    const { viewChangeReason } = reason;

    // Freeze the previous viewState since we don't want to allow Deb to modify it.
    const oldViewState = deepFreeze(viewState);

    try {
      // Fire the pre-change event and check for cancellation
      newViewState = await this.firePreChangeEvent(
        oldViewState,
        newViewState,
        viewChangeReason,
      );
      if (!newViewState) {
        // The view change was cancelled
        return;
      }

      // Actually change the viewState in store.
      store.dispatch(actions.setViewState(deepFreeze(newViewState)));

      // Fire the post-change event and check for cancellation/rollback
      newViewState = await this.firePostChangeEvent(
        oldViewState,
        newViewState,
        viewChangeReason,
      );
      if (!newViewState) {
        // The view change was cancelled, rollback already happened
        return;
      }

      // Actually change the viewState in store for the last time.
      store.dispatch(actions.setViewState(deepFreeze(newViewState)));
    } finally {
      store.dispatch(actions.setViewChanging(false));
    }
  }

  /**
   * Fires the pre-change event allowing event handlers to modify or cancel the view change.
   *
   * @param oldViewState The current view state before the change
   * @param newViewState The proposed new view state
   * @param viewChangeReason The reason for the view change
   * @returns The potentially modified new view state, or null if the change was cancelled
   */
  private async firePreChangeEvent(
    oldViewState: ViewState,
    newViewState: ViewState,
    viewChangeReason?: ViewChangeReason,
  ): Promise<ViewState | null> {
    // Create the view:pre:change event and fire it.
    const preViewChangeEvent: BusEventViewPreChange = {
      type: BusEventType.VIEW_PRE_CHANGE,
      reason: viewChangeReason,
      oldViewState,
      newViewState,
      cancelViewChange: false,
    };
    await this.serviceManager.fire(preViewChangeEvent);

    if (preViewChangeEvent.cancelViewChange) {
      // If the view changing was canceled in the event then log a message and don't change the view.
      debugLog("The view changing was cancelled by a view:pre:change event.");
      return null;
    }

    // If there were no issues with the new view state then use it.
    return preViewChangeEvent.newViewState;
  }

  /**
   * Fires the post-change event allowing event handlers to modify or rollback the view change.
   * If the event is cancelled, the view state is rolled back to the old state.
   *
   * @param oldViewState The previous view state
   * @param newViewState The new view state
   * @param viewChangeReason The reason for the view change
   * @returns The potentially modified new view state, or null if the change was cancelled
   */
  private async firePostChangeEvent(
    oldViewState: ViewState,
    newViewState: ViewState,
    viewChangeReason?: ViewChangeReason,
  ): Promise<ViewState | null> {
    const { store } = this.serviceManager;

    // Create the view:change event and fire it.
    const viewChangeEvent: BusEventViewChange = {
      type: BusEventType.VIEW_CHANGE,
      reason: viewChangeReason,
      oldViewState,
      newViewState,
      cancelViewChange: false,
    };
    await this.serviceManager.fire(viewChangeEvent);

    if (viewChangeEvent.cancelViewChange) {
      // If the view changing was canceled in the event then log a message and switch the viewState back to what it was
      // originally.
      store.dispatch(actions.setViewState(oldViewState));
      debugLog("The view changing was cancelled by a view:change event.");
      return null;
    }

    // If there were no issues with the new view state then use it.
    return viewChangeEvent.newViewState;
  }
}
