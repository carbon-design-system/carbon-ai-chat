/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  attachPartition,
  type AppStore,
  type PartitionReducer,
} from '../store/appStore';

/** What the partition seam needs from a chat: the one store it owns. */
interface ChatStoreOwner<StoreState> {
  store: AppStore<StoreState>;
}

/**
 * Adds a partition to a chat's one store. Its reducer runs after the
 * conversation reducer on every dispatch and gets the conversation state after
 * that dispatch. So one action can change both, and subscribers hear it once.
 *
 * Attaching the same key to the same chat again does nothing. The partition
 * lives as long as the chat, not as long as a mount.
 *
 * @returns Whether this call added the partition. It's `false` when the chat
 * already had it, or has shut down.
 */
function attachStorePartition<StoreState, PartState>(
  chat: ChatStoreOwner<StoreState>,
  key: string,
  reducer: PartitionReducer<PartState, StoreState>,
  initialState: PartState
): boolean {
  return attachPartition(chat.store, key, reducer, initialState);
}

export { attachStorePartition };
