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
  ImageItem,
  MessageResponseTypes,
  TextItem,
} from "@carbon/ai-chat";

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
        } as ImageItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "And now just an image by itself.",
        } as TextItem,
        {
          source:
            "https://onlinejpgtools.com/images/examples-onlinejpgtools/mouse.jpg",
          response_type: MessageResponseTypes.IMAGE,
        } as ImageItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can also use an image as a button.",
        } as TextItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **url** button:",
        } as TextItem,
        {
          url: "https://v10.carbondesignsystem.com/",
          kind: "link",
          label: "Carbon Design System",
          target: "_blank",
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: "url",
          response_type: "button",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **post_back** button:",
        } as TextItem,
        {
          label: "Return a card",
          value: {
            input: {
              text: "card",
            },
          },
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: "post_back",
          response_type: "button",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **show_panel** button:",
        } as TextItem,
        {
          kind: "secondary",
          panel: {
            body: [
              {
                source:
                  "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
                response_type: "image",
              },
              {
                response_type: "text",
                text: "### Peach Colored Blouse",
              },
              {
                response_type: "text",
                text: '#### $59.99\n<span style="color:#fdcc0d;">&#9733;&#9733;&#9733;&#9733;&#9734;</span>&#160;&#160;<span style="color:gray;">3 review(s)</span>',
              },
              {
                response_type: "text",
                text: '<span style="color: #4e4d4d">I\'m baby listicle synth migas air plant DSA cardigan helvetica fanny pack fit chillwave forage. Umami tacos subway tile sriracha skateboard activated charcoal roof party pinterest adaptogen ennui brunch bitters. Helvetica dreamcatcher viral fashion axe, coloring book four dollar toast vexillologist bushwick stumptown mumblecore slow-carb. Tote bag vinyl.</span>',
              },
            ],
            title: "Tanya panel",
            show_animations: false,
          },
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: "show_panel",
          response_type: "button",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "This is a **custom_event** button:",
        } as TextItem,
        {
          kind: "tertiary",
          image_url:
            "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg",
          button_type: "custom_event",
          user_defined: {
            text: "Alert from a picture!",
          },
          response_type: "button",
          custom_event_name: "alert_button",
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doImage };
