/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The prebuilt chat's view partition: its state, actions, reducer, and the
 * view half of saved state. It lives under `view` in the chat's one store, and
 * only the prebuilt chat uses it. Internal; nothing here is exported from a
 * package entry point.
 */

import { attachStorePartition, extendPublicState } from '../../sdk/internal';
import type { PublicStateService } from '../../shared/services/PublicStateService';
import type { AppStore } from '../../shared/store/appStore';
import type { PublicConfig } from '../../types/config/PublicConfig';
import type { ConversationState } from '../../types/state/AppState';
import type { ViewPersistedState } from '../../types/state/ViewPartitionState';
import { createInitialViewState } from './initialState';
import { viewPublicFields } from './publicFields';
import { viewReducer } from './reducer';

/** Where the view partition lives in the chat's store. */
const VIEW_PARTITION_KEY = 'view';

/**
 * Attaches the view partition to a chat, and adds the public fields it holds.
 * Attaching to a chat that already has it does nothing, so view state lives as
 * long as the chat.
 *
 * @param chat The chat to attach to: its store and public state.
 * @param chat.store The chat's one store.
 * @param chat.publicStateService The chat's public state, which gains the view's fields.
 * @param config The host's config.
 * @param saved The saved view half to restore, if a session was saved.
 * @returns Whether this call attached it.
 */
function attachViewState(
  chat: {
    store: AppStore<ConversationState>;
    publicStateService: PublicStateService;
  },
  config: PublicConfig,
  saved: ViewPersistedState | null
): boolean {
  const attached = attachStorePartition(
    chat,
    VIEW_PARTITION_KEY,
    viewReducer,
    createInitialViewState(config, saved)
  );
  if (attached) {
    extendPublicState(chat, viewPublicFields);
  }
  return attached;
}

export { attachViewState };
export { default as viewActions } from './actions';
export * from './defaults';
export { joinPersistedState, viewHalfOf } from './persisted';
