/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This service is responsible for loading conversation history data.
 */

import {
  LoadedHistory,
  notesToLoadedHistory,
} from "../schema/historyToMessages";
import actions from "../store/actions";
import { ViewType } from "../../../types/state/AppState";
import {
  HistoryItem,
  HistoryNote,
  NoteType,
} from "../../../types/messaging/History";

import { consoleError } from "../utils/miscUtils";
import { ServiceManager } from "./ServiceManager";
import { MainWindowOpenReason } from "../../../types/events/eventBusTypes";

class HistoryService {
  /**
   * The service manager to use to access services.
   */
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Fetch from history store. If no history is found (no session or the session has expired), this will return null.
   */
  async loadHistory(useHistory?: {
    notes: HistoryNote[];
  }): Promise<LoadedHistory> {
    const state = this.serviceManager.store.getState();
    const { config, persistedToBrowserStorage } = state;
    const publicConfig = config.public;
    const { viewState } = persistedToBrowserStorage.launcherState;

    try {
      let resultData: { notes: HistoryNote[] };
      if (useHistory) {
        resultData = useHistory;
      } else if (publicConfig.messaging?.customLoadHistory) {
        const items: HistoryItem[] =
          await publicConfig.messaging.customLoadHistory(
            this.serviceManager.instance
          );
        // The "author" property is not currently included in our public NoteItem type. Web chat does not use it.
        const note: HistoryNote = {
          type: NoteType.HISTORY,
          body: items as any,
        };
        resultData = { notes: [note] };
      }

      if (resultData) {
        // If there is result data then grab the notes array, transform it into a LoadedHistory, and return it.
        const historyNotes = resultData?.notes;
        return notesToLoadedHistory(historyNotes, this.serviceManager);
      }

      if (viewState.tour) {
        // If there is no resultData, and a tour was open then try to open the main window. Specify not to hydrate the
        // chat because we're already in the middle of hydrating. This is done below the above checks for a sessionID,
        // since it's possible the sessionID will not exist while the viewState still does. If this happened it would
        // cause the tour to stay stuck open, with no content to show, which we don't want.
        await this.serviceManager.actions.changeView(
          ViewType.MAIN_WINDOW,
          { mainWindowOpenReason: MainWindowOpenReason.SESSION_HISTORY },
          false
        );
        // Clear the tour state, regardless if changeView was successful or not, since there is no tour data to be
        // shown. This is done instead of calling serviceManager.actions.endTour() because this scenario is a little
        // more complicated than the generic endTour scenario.
        this.serviceManager.store.dispatch(actions.clearTourData());
      }
    } catch (error) {
      consoleError(
        "An error occurred while attempting to load the conversation history",
        error
      );
    }

    return null;
  }
}

export { HistoryService };
