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
  ChatViewState,
  ChatViewStateSnapshot,
} from '../services/chatViewState';

/** Returns the chat's view state, which stays the same for the mount. */
function useChatViewStateInstance(): ChatViewState {
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
function useChatViewState<Selected>(
  selector: (snapshot: ChatViewStateSnapshot) => Selected,
  isEqual?: (left: Selected, right: Selected) => boolean
): Selected {
  const viewState = useChatViewStateInstance();
  return useSyncExternalStoreWithSelector(
    viewState.subscribe,
    viewState.getSnapshot,
    viewState.getSnapshot,
    selector,
    isEqual
  );
}

export { useChatViewState, useChatViewStateInstance };
