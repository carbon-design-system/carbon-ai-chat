/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This module is responsible for managing the storage of persisted session data. This way if a user
 * navigates to a new page, the state of the window, thread and other UI state items will remain in tact.
 */

import { VERSION } from "../environmentVariables";
import {
  PersistedChatState,
  PersistedLauncherState,
} from "../../../types/state/AppState";
import { IS_SESSION_STORAGE } from "../utils/browserUtils";
import { consoleError } from "../utils/miscUtils";
import mockStorage from "./mockStorage";
import { ServiceManager } from "./ServiceManager";

// We use sessionStorage instead of localStorage to not have to have a public cookie policy that must be accepted in EU.
const storage: Storage = IS_SESSION_STORAGE()
  ? window.sessionStorage
  : mockStorage;

class UserSessionStorageService {
  private prefix: string;
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
    this.prefix = `CARBON_CHAT_SESSION${
      this.serviceManager?.namespace?.suffix || ""
    }`;
  }

  /**
   * Get the session object.
   */
  loadChatSession(): Partial<PersistedChatState> | null {
    try {
      const chatSessionString = storage.getItem(this.getChatSessionKey());
      const chatSession = chatSessionString
        ? JSON.parse(chatSessionString)
        : null;
      // If the saved session is from a previous version of Carbon AI Chat, we just throw it away to avoid having to deal with
      // having to make sure these sessions are backwards compatible.
      if (chatSession?.version === VERSION) {
        return chatSession;
      }
      this.clearChatSession();
      return null;
    } catch (error) {
      this.clearChatSession();
      return null;
    }
  }

  /**
   * Get the session object.
   */
  loadLauncherSession(): PersistedLauncherState | null {
    try {
      const launcherSessionString = storage.getItem(
        this.getLauncherSessionKey()
      );
      const launcherSession: PersistedLauncherState = launcherSessionString
        ? JSON.parse(launcherSessionString)
        : null;
      // If the saved session is from a previous version of Carbon AI Chat, we just throw it away to avoid having to deal with
      // having to make sure these sessions are backwards compatible.
      if (launcherSession?.version === VERSION) {
        launcherSession.wasLoadedFromBrowser = true;
        return launcherSession;
      }
      this.clearLauncherSession();
      return null;
    } catch (error) {
      this.clearLauncherSession();
      return null;
    }
  }

  /**
   * Set a new version of the user based session.
   */
  persistChatSession(session: Partial<PersistedChatState>) {
    try {
      storage.setItem(this.getChatSessionKey(), JSON.stringify(session));
    } catch (error) {
      consoleError("Error in persistChatSession", error);
    }
  }

  /**
   * Set a new version of the user based session.
   */
  persistLauncherSession(session: PersistedLauncherState) {
    try {
      storage.setItem(this.getLauncherSessionKey(), JSON.stringify(session));
    } catch (error) {
      consoleError("Error in persistLauncherSession", error);
    }
  }

  /**
   * Remove the given session from storage.
   */
  clearChatSession() {
    try {
      storage.removeItem(this.getChatSessionKey());
    } catch (error) {
      consoleError("Error in clearChatSession", error);
    }
  }

  /**
   * Remove the given session from storage.
   */
  clearLauncherSession() {
    try {
      storage.removeItem(this.getLauncherSessionKey());
    } catch (error) {
      consoleError("Error in clearLauncherSession", error);
    }
  }

  /**
   * Returns the sessionStorage key for the session id for the given user.
   */
  getChatSessionKey() {
    return this.prefix;
  }

  /**
   * Returns the sessionStorage key for the session id for the given user.
   */
  getLauncherSessionKey() {
    return this.prefix;
  }
}

export { UserSessionStorageService };
