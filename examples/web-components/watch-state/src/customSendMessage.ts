/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome! This example demonstrates watching ChatInstance state changes.

Try sending a message to see the chat view, or click the home icon to see the homescreen view.

Type "user_defined" to see the custom response with active response id.

Type "history" if you'd like to see how you would load history.`;

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  if (request.input.text === "") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: WELCOME_TEXT,
          },
        ],
      },
    });
  } else {
    const inputText = (request.input.text || "").trim().toLowerCase();

    switch (inputText) {
      case "show me a user_defined response":
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: {
                  user_defined_type: "my_unique_identifier",
                  text: "Some text from your back-end.",
                },
              },
            ],
          },
        });
        break;
      default:
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: "That is super great!",
              },
            ],
          },
        });
    }
  }
}

export { customSendMessage };
