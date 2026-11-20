/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type {
  GenericItem,
  MessageResponse,
} from '../../types/messaging/Messages';

function outputItemData(
  item: GenericItem,
  message: MessageResponse,
  id: string,
  isLatestWelcomeNode = false
): LocalMessageItem {
  const localMessage: LocalMessageItem = {
    ui_state: { id },
    item,
    fullMessageID: message.id,
  };
  if (isLatestWelcomeNode) {
    localMessage.ui_state.isWelcomeResponse = true;
  }
  return localMessage;
}

export { outputItemData };
