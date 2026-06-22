/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the messages-custom-footer example.
 *
 * Demonstrates: attaching a `custom_footer_slot` to assistant messages so the
 * chat fires the custom-footer event and calls `renderCustomMessageFooter`.
 * Every reply here carries the slot, so the copy footer always shows.
 *
 * APIs exercised:
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *   - `message_item_options.custom_footer_slot` (`slot_name`, `is_on`, `additional_data`)
 *
 * Start reading at: the exported `customSendMessage` function near the bottom.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT =
  "Welcome! Every reply in this example includes a custom footer — the copy button beneath this message. Send anything to see another.";

const REPLY_TEXT =
  "Here is a reply with a custom footer. Use the copy button to copy this text.";

// Each footer needs its own `slot_name`. A slot name uniquely identifies a single footer
// instance, so every message must use a different value — reusing one name across messages
// collapses them onto a single slot and only the first message's footer renders.
let footerInstanceCount = 0;

// Build an assistant text item with a custom footer attached. The
// `custom_footer_slot` is what makes the chat render the footer; its
// `additional_data` is handed verbatim to `renderCustomMessageFooter`, which
// reads it to decide which buttons to show.
function textWithFooter(text: string) {
  footerInstanceCount += 1;
  return {
    response_type: MessageResponseTypes.TEXT,
    text,
    message_item_options: {
      custom_footer_slot: {
        slot_name: `copy_footer_${footerInstanceCount}`,
        is_on: true,
        additional_data: {
          allow_copy: true,
        },
      },
    },
  };
}

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  // The chat sends one empty-input turn when it opens; greet the user with a
  // footer already attached so the buttons are visible from first paint.
  const text = request.input.text === "" ? WELCOME_TEXT : REPLY_TEXT;
  instance.messaging.addMessage({
    output: {
      generic: [textWithFooter(text)],
    },
  });
}

export { customSendMessage };
