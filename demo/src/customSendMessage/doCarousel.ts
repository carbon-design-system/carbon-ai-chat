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
  GenericItem,
  MessageResponseTypes,
  TextItem,
} from "@carbon/ai-chat";

function doCarousel(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Please select one item you would like to order:",
        } as TextItem,
        {
          items: [
            {
              body: [
                {
                  source:
                    "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
                  response_type: "image",
                },
                {
                  response_type: "text",
                  text: "**Peach Colored Blouse**",
                },
                {
                  response_type: "text",
                  text: '<span style="color: var(--cds-text-secondary)">I\'m baby beard cornhole gatekeep, lyft hoodie disrupt locavore raw denim meggings.</span>',
                },
                {
                  response_type: "text",
                  text: '#### $59.99\n<span style="color:#fdcc0d;">&#9733;&#9733;&#9733;&#9733;&#9734;</span>&#160;&#160;<span style="color:gray;">3 review(s)</span>',
                },
              ],
              footer: [
                {
                  label: "Select",
                  button_type: "custom_event",
                  custom_event_name: "alert_button",
                  user_defined: {
                    text: "You selected!",
                  },
                  response_type: "button",
                },
              ],
              response_type: "card",
            },
            {
              body: [
                {
                  source:
                    "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
                  response_type: "image",
                },
                {
                  response_type: "text",
                  text: "**Green Leopard Jacket**",
                },
                {
                  response_type: "text",
                  text: '<span style="color: var(--cds-text-secondary)">Street art banjo vaporware, hot chicken marxism art party neutra quinoa sustainable activated charcoal.</span>',
                },
                {
                  response_type: "text",
                  text: '<h4><s>$179.99</s> $29.99</h4>\n<span style="color:#fdcc0d;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>&#160;&#160;<span style="color:gray;">10 review(s)</span>',
                },
              ],
              footer: [
                {
                  label: "Select",
                  button_type: "custom_event",
                  custom_event_name: "alert_button",
                  user_defined: {
                    text: "You selected!",
                  },
                  response_type: "button",
                },
              ],
              response_type: "card",
            },
            {
              body: [
                {
                  source:
                    "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
                  response_type: "image",
                },
                {
                  response_type: "text",
                  text: "**Yellow Wool Hat**",
                },
                {
                  response_type: "text",
                  text: '<span style="color: var(--cds-text-secondary)">Succulents skateboard adaptogen solarpunk semiotics, viral locavore palo santo.</span>',
                },
                {
                  response_type: "text",
                  text: '#### $29.99\n<span style="color:#fdcc0d;">&#9733;&#9733;&#9733;&#9734;&#9734;</span>&#160;&#160;<span style="color:gray;">5 review(s)</span>',
                },
              ],
              footer: [
                {
                  label: "Select",
                  button_type: "custom_event",
                  custom_event_name: "alert_button",
                  user_defined: {
                    text: "You selected!",
                  },
                  response_type: "button",
                },
              ],
              response_type: "card",
            },
          ],
          response_type: "carousel",
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doCarousel };
