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
