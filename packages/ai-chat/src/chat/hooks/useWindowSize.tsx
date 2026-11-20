/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a React hook that will provided access to the current window size and is updated as the window size changes.
 */

import { useChatMountState } from './useChatMountState';
import type { ChatMountStateSnapshot } from '../services/chatMountState';

const selectWindowSize = (snapshot: ChatMountStateSnapshot) =>
  snapshot.windowSize;

function useWindowSize() {
  return useChatMountState(selectWindowSize);
}

export { useWindowSize };
