/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';
import type { MessageItemViewFlags } from '../../types/state/ViewPartitionState';
import { useSelector } from './useSelector';
import { useServiceManager } from './useServiceManager';

/**
 * The view's flags for the message item a local item draws, from the view
 * partition, which keys them by public item ID. `undefined` when the item has
 * none.
 *
 * @param localItemID The local item's ID (`ui_state.id`).
 */
function useMessageItemFlags(
  localItemID: string
): Readonly<MessageItemViewFlags> | undefined {
  const { publicStateService } = useServiceManager();
  return useSelector((state: AppState) => {
    const itemID = publicStateService.messageItemIDOf(localItemID, state);
    return itemID === undefined
      ? undefined
      : state.view.messageItemFlags[itemID];
  });
}

export { useMessageItemFlags };
