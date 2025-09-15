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
function doImage(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          title: "The image title (optional)",
          source:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          description: "The image description (optional)",
          response_type: MessageResponseTypes.IMAGE,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "And now just an image by itself.",
        },
        {
          source:
            "https://onlinejpgtools.com/images/examples-onlinejpgtools/mouse.jpg",
          response_type: MessageResponseTypes.IMAGE,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can also use an image as a button.",
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **url** button:",
        },
        {
          url: "https://v10.carbondesignsystem.com/",
          kind: "LINK",
          label: "Carbon Design System",
          target: "_blank",
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: ButtonItemType.URL,
          response_type: MessageResponseTypes.BUTTON,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **post_back** button:",
        },
        {
          label: "Return a card",
          value: {
            input: {
              text: "card",
            },
          },
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: ButtonItemType.POST_BACK,
          response_type: MessageResponseTypes.BUTTON,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **show_panel** button:",
        },
        {
          kind: BUTTON_KIND.SECONDARY,
          panel: {
            body: [
              {
                source:
                  "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
                response_type: MessageResponseTypes.IMAGE,
              },
              {
                response_type: MessageResponseTypes.TEXT,
                text: "### Peach Colored Blouse",
              },
              {
                response_type: MessageResponseTypes.TEXT,
                text: '#### $59.99\n<span style="color:#fdcc0d;">&#9733;&#9733;&#9733;&#9733;&#9734;</span>&#160;&#160;<span style="color:gray;">3 review(s)</span>',
              },
              {
                response_type: MessageResponseTypes.TEXT,
                text: '<span style="color: #4e4d4d">I\'m baby listicle synth migas air plant DSA cardigan helvetica fanny pack fit chillwave forage. Umami tacos subway tile sriracha skateboard activated charcoal roof party pinterest adaptogen ennui brunch bitters. Helvetica dreamcatcher viral fashion axe, coloring book four dollar toast vexillologist bushwick stumptown mumblecore slow-carb. Tote bag vinyl.</span>',
              },
            ],
            title: "Tanya panel",
            show_animations: false,
          },
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: ButtonItemType.SHOW_PANEL,
          response_type: MessageResponseTypes.BUTTON,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **custom_event** button:",
        },
        {
          kind: BUTTON_KIND.TERTIARY,
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: ButtonItemType.CUSTOM_EVENT,
          user_defined: {
            text: "Alert from a picture!",
          },
          response_type: MessageResponseTypes.BUTTON,
          custom_event_name: "alert_button",
        },
      ],
    },
  });
}

export { doImage };
