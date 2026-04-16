/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { VERSION } from "../../chat/utils/environmentVariables";
import { PersistedState } from "../../types/state/AppState";
import { IS_SESSION_STORAGE } from "../../chat/utils/browserUtils";
import { getSuffix } from "../../chat/services/NamespaceService";

/**
 * Reads and validates the Carbon AI Chat session from sessionStorage.
 * Returns null if no session exists, if the data is corrupt, or if the
 * session was written by a different version of the library (version mismatch).
 *
 * Pass the same namespace value as {@link PublicConfig.namespace} (if any).
 *
 * @example
 * const session = readCarbonChatSession();
 * const wasOpen = session?.viewState.mainWindow === true;
 *
 * @example
 * // With a namespace matching PublicConfig.namespace
 * const session = readCarbonChatSession("myapp");
 * const wasOpen = session?.viewState.mainWindow === true;
 *
 * @category Utilities
 */
function readCarbonChatSession(namespace?: string): PersistedState | null {
  try {
    if (!IS_SESSION_STORAGE()) {
      return null;
    }
    const key = `CARBON_CHAT_SESSION${getSuffix(namespace)}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as PersistedState;
    if (session?.version !== VERSION) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export { readCarbonChatSession };
