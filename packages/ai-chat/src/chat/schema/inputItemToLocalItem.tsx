/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import {
  MessageRequest,
  MessageResponseTypes,
} from "../../types/messaging/Messages";
import { uuid, UUIDType } from "../utils/lang/uuid";

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
  id: string = uuid(UUIDType.LOCAL_MESSAGE),
): LocalMessageItem {
  const localMessage: LocalMessageItem = {
    // The individual message in the format of an item from output.generic in the docs above.
    item: {
      response_type: MessageResponseTypes.TEXT,
      ...message.input,
    },
    // ui_state is for rendering concerns and is not persistent.
    ui_state: {
      id,
      originalUserText,
      needsAnnouncement: false, // We don't announce text that came from the user.
    },
    fullMessageID: message.id,
  };

  return localMessage;
}

export default inputItemToLocalItem;
