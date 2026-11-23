/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import { AppState, ViewState, ViewType } from '../../types/state/AppState';

import { deepFreeze } from '../../sdk/utils/lang/objectUtils';

import { VIEW_STATE_ALL_CLOSED } from '../../sdk/store/reducerUtils';

import { consoleError, debugLog } from '../../sdk/utils/miscUtils';

import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  MainWindowCloseReason,
  MainWindowOpenReason,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';

import type { ServiceManager } from '../../sdk/services/ServiceManager';

import { viewActions } from '../state';

import { chatStore } from './attachChatView';

/**
 * Take a newView, either in string format or as a partial {@link ViewState}, and combine it with the current viewState
 * to form a complete view state that is then returned.
 */
function constructViewState(
  newView: ViewType | Partial<ViewState>,
  appState: AppState
): ViewState {
  const { viewState } = appState.view.persistedToBrowserStorage;

  // Start with the existing view state.
  let newViewState: ViewState;

  // Depending on the type of newView go through different steps to construct a new viewState.
  if (typeof newView === 'string') {
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

class ViewService {
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
      viewChangeReason: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    },
    tryHydrating = true,
    forceViewChange = false
  ): Promise<ViewState> {
    const store = chatStore(this.serviceManager);
    const { viewState } = store.getState().view.persistedToBrowserStorage;

    // Build the new viewState object.
    let newViewState = constructViewState(newView, store.getState());

    if (!isEqual(newViewState, viewState) || forceViewChange) {
      // Snapshot what was actually requested before any view:pre:change/view:change listener gets a
      // chance to mutate newViewState (in place or by replacement) via the event payload.
      const requestedMainWindow = newViewState.mainWindow;

      // If the newViewState is different from the current viewState, or the viewChange is being forced to happen, fire
      // the view:change events and change which views are visible.
      await this.fireViewChangeEventsAndChangeView(newViewState, reason);

      // Check and see if the chat should be hydrated.
      newViewState = store.getState().view.persistedToBrowserStorage.viewState;

      // A host's view:pre:change/view:change handler may force the main window open (for example by
      // mutating event.newViewState.mainWindow) even when the caller didn't request it and passed
      // tryHydrating false (the deferred-hydration cold-boot path). Hydrate anyway in that case, or
      // customSendMessage/customLoadHistory would never run for the newly-visible window.
      const hostForcedMainWindowOpen =
        newViewState.mainWindow && !requestedMainWindow;

      if (
        (tryHydrating || hostForcedMainWindowOpen) &&
        newViewState.mainWindow &&
        !store.getState().isHydrated
      ) {
        // If it's ok to hydrate, the main window is now visible, and the chat isn't hydrated, then hydrate
        // the chat. Since this function is only responsible for changing the view don't await hydrateChat(), instead
        // let hydrateChat complete on its own time.
        this.serviceManager.actions.hydrateChat().catch((error) => {
          consoleError('Error hydrating the chat', error);
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
   * @returns True to indicate that the view was changed. False indicates the view change was cancelled.
   */
  private async fireViewChangeEventsAndChangeView(
    newViewState: ViewState,
    reason: {
      viewChangeReason: ViewChangeReason;
      mainWindowOpenReason?: MainWindowOpenReason;
      mainWindowCloseReason?: MainWindowCloseReason;
    }
  ): Promise<void> {
    const store = chatStore(this.serviceManager);

    if (store.getState().view.viewChanging) {
      // If the view is already in the middle of changing then throw an error.
      throw new Error(
        'The view may not be changed while a view change event is already running. Please make sure to resolve any promises from these events.'
      );
    }

    store.dispatch(viewActions.setViewChanging(true));

    const { viewState } = store.getState().view.persistedToBrowserStorage;
    // If we have a mainWindowOpenReason or mainWindowCloseReason then this viewChangeReason will be determined lower down.
    const { viewChangeReason } = reason;

    // Freeze the previous viewState since we don't want to allow Deb to modify it.
    const oldViewState = deepFreeze(viewState);

    try {
      // Create the view:pre:change event and fire it.
      const preViewChangeEvent: BusEventViewPreChange = {
        type: BusEventType.VIEW_PRE_CHANGE,
        reason: viewChangeReason,
        oldViewState,
        newViewState,
        cancelViewChange: false,
      };
      await this.serviceManager.fire(preViewChangeEvent);

      if (preViewChangeEvent.cancel || preViewChangeEvent.cancelViewChange) {
        // If the view changing was canceled in the event then log a message and don't change the view.
        debugLog('The view changing was canceled by a view:pre:change event.');
        return;
      }

      // If there were no issues with the new view state then use it.
      newViewState = preViewChangeEvent.newViewState;

      // Actually change the viewState in store.
      store.dispatch(viewActions.setViewState(deepFreeze(newViewState)));

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
        store.dispatch(viewActions.setViewState(oldViewState));
        debugLog('The view changing was canceled by a view:change event.');
        return;
      }

      // If there were no issues with the new view state then use it.
      newViewState = viewChangeEvent.newViewState;

      // Actually change the viewState in store for the last time.
      store.dispatch(viewActions.setViewState(deepFreeze(newViewState)));
    } finally {
      store.dispatch(viewActions.setViewChanging(false));
    }
  }
}

export { ViewService };
