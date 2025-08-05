/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains the subscription functions that run against the redux store.
 */

import { ServiceManager } from "../services/ServiceManager";
import { AppState } from "../../../types/state/AppState";
import { isBrowser } from "../utils/browserUtils";

// The amount of time to delay after displaying "New message" in the window title before it changes to "(n) Original
// message".
const UNREAD_COUNT_TITLE_TIME = 10000;

/**
 * Copies persistedToBrowserStorage to the session history.
 */
function copyToSessionStorage(serviceManager: ServiceManager) {
  let previousPersistedToBrowserStorage =
    serviceManager.store.getState().persistedToBrowserStorage;
  return () => {
    const { persistedToBrowserStorage } = serviceManager.store.getState();
    const persistChatSession =
      previousPersistedToBrowserStorage !== persistedToBrowserStorage;

    if (persistChatSession) {
      previousPersistedToBrowserStorage = persistedToBrowserStorage;

      serviceManager.userSessionStorageService.persistChatSession(
        persistedToBrowserStorage.chatState
      );
      serviceManager.userSessionStorageService.persistLauncherSession(
        persistedToBrowserStorage.launcherState
      );
    }
  };
}

/**
 * This creates a subscription that listens for changes to unread live agent messages and updates the window title
 * as appropriate to show the user that messages are unread.
 */
function createHandleWindowTitle(serviceManager: ServiceManager) {
  const { store } = serviceManager;

  let originalTitle: string;
  let changeTitleTimer: ReturnType<typeof setTimeout>;
  let previousState: AppState = store.getState();

  return () => {
    const state = store.getState();
    const { agentState } = store.getState();
    const { numUnreadMessages } = agentState;

    if (numUnreadMessages !== previousState.agentState.numUnreadMessages) {
      if (isBrowser) {
        if (!numUnreadMessages) {
          // Nothing unread anymore so reset the window title.
          clearTimeout(changeTitleTimer);
          if (originalTitle) {
            window.document.title = originalTitle;
            originalTitle = null;
          }
        } else {
          // A new message has appeared so change the title to "New Message" and then set a timer to change it to a
          // version that has "(n)" in it.
          clearTimeout(changeTitleTimer);
          if (!originalTitle) {
            originalTitle = window.document.title;
          }
          window.document.title = state.languagePack.agent_newMessage;
          changeTitleTimer = setTimeout(() => {
            window.document.title = `(${numUnreadMessages}) ${originalTitle}`;
          }, UNREAD_COUNT_TITLE_TIME);
        }
      }
    }

    previousState = state;
  };
}

export { copyToSessionStorage, createHandleWindowTitle };
