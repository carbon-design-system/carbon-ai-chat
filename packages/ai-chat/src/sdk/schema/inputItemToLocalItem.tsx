/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { inputItemData } from './inputItemData';
import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import {
  MessageRequest,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

/**
 * Takes data from {@link MessageRequest} and transforms into something usable by the chat internally.
 *
 * @param  message Takes a {@link MessageRequest} object. With an additional `ui_state`
 * object for local state.
 * @param originalUserText The original text provided by the user before it was potentially modified on the
 * underlying {@link MessageRequest}. This value may be null if there is no text from the user to display.
 * instance.
 * @param id If you have already generated an id, it's ok to pass it in. If not, one will be generated.
 */
function inputItemToLocalItem(
  message: MessageRequest,
  originalUserText: string,
  id: string = uuid()
): LocalMessageItem {
  return inputItemData(
    message,
    originalUserText,
    id,
    MessageResponseTypes.TEXT
  );
}

export default inputItemToLocalItem;
