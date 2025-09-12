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
import { HistoryItem, HistoryNote } from "../../types/messaging/History";

import { consoleError } from "../utils/miscUtils";
import { ServiceManager } from "./ServiceManager";

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
    const { config } = state;
    const publicConfig = config.public;

    try {
      let resultData: { notes: HistoryNote[] };
      if (useHistory) {
        resultData = useHistory;
      } else if (publicConfig.messaging?.customLoadHistory) {
        const items: HistoryItem[] =
          await publicConfig.messaging.customLoadHistory(
            this.serviceManager.instance,
          );
        const note: HistoryNote = {
          body: items,
        };
        resultData = { notes: [note] };
      }

      if (resultData) {
        // If there is result data then grab the notes array, transform it into a LoadedHistory, and return it.
        const historyNotes = resultData?.notes;
        return notesToLoadedHistory(historyNotes, this.serviceManager);
      }
    } catch (error) {
      consoleError(
        "An error occurred while attempting to load the conversation history",
        error,
      );
    }

    return null;
  }
}

export { HistoryService };
