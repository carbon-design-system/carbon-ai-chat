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

      serviceManager.userSessionStorageService.persistSession(
        persistedToBrowserStorage,
      );
    }
  };
}

export { copyToSessionStorage };
