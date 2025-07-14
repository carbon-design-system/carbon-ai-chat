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
  IFrameItem,
  MessageResponseTypes,
  TextItem,
} from "@carbon/ai-chat";

function doIFrame(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can show an iframe either in a hero card that opens up a panel, or inline.",
        } as TextItem,
        {
          source:
            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/iframe-example.html",
          response_type: MessageResponseTypes.IFRAME,
          image_url:
            "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
          description:
            "An example page to test url unfurling and iframe permissions for the iframe response type.",
          title: "IFrame example panel",
        } as IFrameItem,
        {
          source:
            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/iframe-example.html",
          response_type: MessageResponseTypes.IFRAME,
          image_url:
            "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
          description:
            "An example page to test url unfurling and iframe permissions for the iframe response type.",
          title: "An inline display of an iframe",
          display: "inline",
        } as IFrameItem,
      ],
    },
  });
}

export { doIFrame };
