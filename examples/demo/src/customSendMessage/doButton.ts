/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import {
  ChatInstance,
  GenericItem,
  MessageResponseTypes,
  TextItem,
} from "@carbon/ai-chat";

function doButton(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Buttons can be used to either send content back to your assistant, open URLs, open a panel, or throw client side events to drive client side code.",
        } as TextItem,
        {
          response_type: "button",
          label: "Run some code",
          kind: "danger",
          button_type: "custom_event",
          custom_event_name: "alert_button",
          user_defined: {
            text: "Alert!",
          },
        } as unknown as GenericItem,
        {
          response_type: "button",
          label: "Send a message",
          button_type: "post_back",
          value: {
            input: {
              text: "button",
            },
          },
        } as unknown as GenericItem,
        {
          response_type: "button",
          button_type: "show_panel",
          label: "Open a panel",
          kind: "secondary",
          panel: {
            title: "My panel",
            show_animations: true,
            body: [
              {
                response_type: "text",
                text: "Product details or other ancillary info",
              },
            ],
          },
        } as unknown as GenericItem,
        {
          response_type: "button",
          button_type: "url",
          label: "Visit ibm.com",
          url: "https://www.ibm.com",
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doButton };
