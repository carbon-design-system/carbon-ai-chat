/*
 *  Copyright IBM Corp. 2025, 2026
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

import { VERSION } from '../utils/environmentVariables';
import { PersistedState } from '../../types/state/PersistedState';
import { IS_SESSION_STORAGE } from '../utils/browserUtils';
import { consoleError } from '../utils/miscUtils';
import mockStorage from './mockStorage';
import { ServiceManager } from './ServiceManager';

// We use sessionStorage instead of localStorage to not have to have a public cookie policy that must be accepted in EU.
let storage: Storage | undefined;

/**
 * The storage to use, probed on first use rather than when this module loads,
 * so importing it touches no storage. A chat `createChatSDK` starts never
 * creates this service, so it never probes.
 */
function sessionStore(): Storage {
  if (!storage) {
    storage = IS_SESSION_STORAGE() ? window.sessionStorage : mockStorage;
  }
  return storage;
}

class UserSessionStorageService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Get the session object.
   */
  loadSession(): PersistedState | null {
    try {
      const sessionString = sessionStore().getItem(this.getSessionKey());
      const session: PersistedState = sessionString
        ? JSON.parse(sessionString)
        : null;
      // If the saved session is from a previous version of Carbon AI Chat, we just throw it away to avoid having to deal with
      // having to make sure these sessions are backwards compatible.
      if (session?.version === VERSION) {
        session.wasLoadedFromBrowser = true;
        session.launcherIsExpanded = false;
        return session;
      }
      this.clearSession();
      return null;
    } catch (_error) {
      this.clearSession();
      return null;
    }
  }

  /**
   * Set a new version of the user based session.
   */
  persistSession(session: PersistedState) {
    try {
      sessionStore().setItem(this.getSessionKey(), JSON.stringify(session));
    } catch (error) {
      consoleError('Error in persistSession', error);
    }
  }

  /**
   * Remove the given session from storage.
   */
  clearSession() {
    try {
      sessionStore().removeItem(this.getSessionKey());
    } catch (error) {
      consoleError('Error in clearSession', error);
    }
  }

  /**
   * Returns the sessionStorage key for the session id for the given user. The
   * key is derived from the current namespace on each access (rather than cached
   * at construction) so that a runtime namespace change moves the session to the
   * correct bucket.
   */
  getSessionKey() {
    return `CARBON_CHAT_SESSION${this.serviceManager?.namespace?.suffix || ''}`;
  }
}

export { UserSessionStorageService };
