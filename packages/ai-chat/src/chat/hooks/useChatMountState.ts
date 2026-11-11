/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useContext } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector.js';
import { ChatContext } from '../contexts/ChatContext';
import type {
  ChatMountState,
  ChatMountStateSnapshot,
} from '../services/chatMountState';

/** Returns the chat's view state, which stays the same for the mount. */
function useChatMountStateInstance(): ChatMountState {
  const viewState = useContext(ChatContext);
  if (!viewState) {
    throw new Error('ChatContext is missing in the component tree.');
  }
  return viewState;
}

/**
 * Selects a field of the chat's view state and re-renders only when the
 * selected value changes. Uses the same React 17 shim as `useSelector`.
 */
function useChatMountState<Selected>(
  selector: (snapshot: ChatMountStateSnapshot) => Selected,
  isEqual?: (left: Selected, right: Selected) => boolean
): Selected {
  const viewState = useChatMountStateInstance();
  return useSyncExternalStoreWithSelector(
    viewState.subscribe,
    viewState.getSnapshot,
    viewState.getSnapshot,
    selector,
    isEqual
  );
}

export { useChatMountState, useChatMountStateInstance };
