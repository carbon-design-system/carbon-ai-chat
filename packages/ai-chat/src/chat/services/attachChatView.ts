/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../../shared/services/ServiceManager';
import type { AppStore } from '../../shared/store/appStore';
import { loadSavedSession } from '../../shared/store/doCreateStore';
import { toPersistableState } from '../../shared/store/persistenceUtils';
import type { PublicConfig } from '../../types/config/PublicConfig';
import type { AppState } from '../../types/state/AppState';
import { attachViewState, joinPersistedState, viewHalfOf } from '../state';

/**
 * The prebuilt chat's store: the conversation partition plus the view
 * partition the shell attached at boot.
 */
function chatStore(
  serviceManager: Pick<ServiceManager, 'store'>
): AppStore<AppState> {
  return serviceManager.store as unknown as AppStore<AppState>;
}

/**
 * Saves the session whenever either half of it changes. By default it goes to
 * session storage. When the host owns persistence (`config.persistedState`),
 * it goes to the host's `onStateChange` instead. A change to anything else,
 * such as input text, saves nothing.
 */
function saveSessionOnChange(serviceManager: ServiceManager) {
  const store = chatStore(serviceManager);
  let previousConversation = store.getState().persistedToBrowserStorage;
  let previousView = store.getState().view.persistedToBrowserStorage;
  store.subscribe(() => {
    const { persistedToBrowserStorage, view, config } = store.getState();
    if (
      previousConversation === persistedToBrowserStorage &&
      previousView === view.persistedToBrowserStorage
    ) {
      return;
    }
    previousConversation = persistedToBrowserStorage;
    previousView = view.persistedToBrowserStorage;

    const saved = joinPersistedState(
      persistedToBrowserStorage,
      view.persistedToBrowserStorage
    );
    const persistedStateConfig = config.public.persistedState;
    if (
      persistedStateConfig?.initialState ||
      persistedStateConfig?.onStateChange
    ) {
      persistedStateConfig.onStateChange?.(toPersistableState(saved));
    } else {
      serviceManager.userSessionStorageService?.persistSession(saved);
    }
  });
}

/**
 * Attaches the view partition at boot, restoring the view half of a saved
 * session, and starts saving the session. The conversation restored its own
 * half when it created the store. A chat that already has its view does
 * nothing.
 */
function attachChatView(
  serviceManager: ServiceManager,
  publicConfig: PublicConfig
) {
  const saved = loadSavedSession(publicConfig, serviceManager);
  if (
    attachViewState(serviceManager, publicConfig, saved && viewHalfOf(saved))
  ) {
    saveSessionOnChange(serviceManager);
  }
}

export { attachChatView, chatStore };
