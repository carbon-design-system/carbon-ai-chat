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
import { BusEventType } from "../../types/events/eventBusTypes";
import { PublicChatState } from "../../types/instance/ChatInstance";
import isEqual from "lodash-es/isEqual.js";

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

/**
 * Fires a STATE_CHANGE event whenever the public state changes.
 */
function fireStateChangeEvent(serviceManager: ServiceManager) {
  let previousState: PublicChatState =
    serviceManager.actions.getPublicChatState();

  return () => {
    const newState = serviceManager.actions.getPublicChatState();

    // Use deep equality check to detect any changes in the state
    if (!isEqual(previousState, newState)) {
      serviceManager.eventBus.fireSync(
        {
          type: BusEventType.STATE_CHANGE,
          previousState,
          newState,
        },
        serviceManager.instance,
      );

      previousState = newState;
    }
  };
}

export { copyToSessionStorage, fireStateChangeEvent };
