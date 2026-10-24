/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector.js';
import type { PublicChatState } from '../../types/instance/PublicChatState';
import { useServiceManager } from './useServiceManager';

export function usePublicChatState<Selected>(
  selector: (state: PublicChatState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean
): Selected {
  const { instance } = useServiceManager();
  return useSyncExternalStoreWithSelector(
    instance.state.subscribe,
    instance.state.get,
    instance.state.get,
    selector,
    equalityFn
  );
}
