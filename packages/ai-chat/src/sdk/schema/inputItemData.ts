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
  MessageRequest,
  MessageResponseTypes,
} from '../../types/messaging/Messages';

function inputItemData(
  message: MessageRequest,
  originalUserText: string,
  id: string,
  responseType: MessageResponseTypes.TEXT
): LocalMessageItem {
  return {
    item: { response_type: responseType, ...message.input },
    ui_state: { id, originalUserText },
    fullMessageID: message.id,
  };
}

export { inputItemData };
