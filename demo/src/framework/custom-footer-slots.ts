/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Message, MessageResponseTypes } from '@carbon/ai-chat';

/**
 * Gives every item in an assistant reply a footer slot, so the demo's slot-visibility toggle puts a footer beneath
 * each reply the way it does beneath each user message. The user-message footer needs nothing on the message; the
 * assistant one reads `custom_footer_slot` off each item, so the demo attaches it the way a host would, before the chat
 * reads the message.
 *
 * Slot names come from the message id and item position rather than a fresh id, so a message that passes through
 * here more than once keeps the same slot.
 */
function addCustomFooterSlots(message: Message) {
  if (!('output' in message) || !message.output?.generic) {
    return;
  }

  message.output.generic.forEach((item, index) => {
    // A pause renders no message, so its slot would never reach the DOM. An item that already names its own footer
    // keeps it.
    if (
      item.response_type === MessageResponseTypes.PAUSE ||
      item.message_item_options?.custom_footer_slot
    ) {
      return;
    }

    item.message_item_options = {
      ...item.message_item_options,
      custom_footer_slot: {
        is_on: true,
        slot_name: `footer-${message.id}-${index}`,
      },
    };
  });
}

export { addCustomFooterSlots };
