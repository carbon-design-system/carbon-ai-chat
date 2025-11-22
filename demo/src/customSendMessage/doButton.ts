/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ButtonItemType,
  ChatInstance,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "@carbon/ai-chat-components/es/react/chat-button.js";

function doButton(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Buttons can be used to either send content back to your assistant, open URLs, open a panel, or throw client side events to drive client side code.",
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          size: CHAT_BUTTON_SIZE.SMALL,
          kind: CHAT_BUTTON_KIND.DANGER,
          label: "Fire a client side event",
          button_type: ButtonItemType.CUSTOM_EVENT,
          custom_event_name: "alert_button",
          // Pass any extra meta data you want here and it will be included in the event payload.
          user_defined: {
            text: "You can have your buttons hook into your application code with events with custom payloads",
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          size: CHAT_BUTTON_SIZE.SMALL,
          kind: CHAT_BUTTON_KIND.SECONDARY,
          label: "Send a message to your server",
          button_type: ButtonItemType.POST_BACK,
          value: {
            input: {
              text: "button",
            },
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          size: CHAT_BUTTON_SIZE.SMALL,
          kind: CHAT_BUTTON_KIND.TERTIARY,
          button_type: ButtonItemType.SHOW_PANEL,
          label: "Open a panel",
          panel: {
            title: "My panel",
            show_animations: true,
            body: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: "Carbon is great!",
              },
            ],
            footer: [
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.URL,
                url: "https://ibm.com",
                label: "Optional Button",
              },
            ],
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          size: CHAT_BUTTON_SIZE.SMALL,
          kind: CHAT_BUTTON_KIND.PRIMARY,
          button_type: ButtonItemType.URL,
          label: "Add a button that is a link",
          url: "https://carbon-ai-chat-components.netlify.app/?path=/docs/components-chat-button--docs",
        },
      ],
    },
  });
}

export { doButton };
