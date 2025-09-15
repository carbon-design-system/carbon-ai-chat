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
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/defs.js";

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
          label: "Alert button",
          kind: BUTTON_KIND.DANGER,
          button_type: ButtonItemType.CUSTOM_EVENT,
          custom_event_name: "alert_button",
          // Pass any extra meta data you want here and it will be included in the event payload.
          user_defined: {
            text: "Carbon!",
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          label: "Send a message",
          button_type: ButtonItemType.POST_BACK,
          value: {
            input: {
              text: "button",
            },
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.SHOW_PANEL,
          label: "Open a panel",
          kind: BUTTON_KIND.SECONDARY,
          panel: {
            title: "My panel",
            show_animations: true,
            body: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: "Carbon!",
              },
            ],
          },
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.URL,
          label: "Visit ibm.com",
          url: "https://www.ibm.com",
        },
      ],
    },
  });
}

export { doButton };
