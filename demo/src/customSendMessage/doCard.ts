/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, GenericItem, WidthOptions } from "@carbon/ai-chat";

function doCard(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          body: [
            {
              response_type: "text",
              text: "##### Task",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          source:
                            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/example_avatar_1.png",
                          response_type: "image",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Matt Hidinger**\nCreated Tue, Feb 14, 2017",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "40px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
            {
              response_type: "text",
              text: "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Board:**\n**List:**\n**Assigned to:**\n**Due date:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "Adaptive Cards\nBacklog\nMatt Hidinger\nNot set",
                        },
                      ],
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "84px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
          ],
          footer: [
            {
              url: "https://adaptivecards.io/",
              kind: "secondary",
              label: "View",
              button_type: "url",
              response_type: "button",
            },
          ],
          response_type: "card",
        } as unknown as GenericItem,
        {
          max_width: WidthOptions.SMALL,
          body: [
            {
              response_type: "text",
              text: "##### Task with max_width: WidthOptions.SMALL on card",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          source:
                            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/example_avatar_1.png",
                          response_type: "image",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Matt Hidinger**\nCreated Tue, Feb 14, 2017",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "40px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
            {
              response_type: "text",
              text: "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Board:**\n**List:**\n**Assigned to:**\n**Due date:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "Adaptive Cards\nBacklog\nMatt Hidinger\nNot set",
                        },
                      ],
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "84px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
          ],
          footer: [
            {
              url: "https://adaptivecards.io/",
              kind: "secondary",
              label: "View",
              button_type: "url",
              response_type: "button",
            },
          ],
          response_type: "card",
        } as unknown as GenericItem,
        {
          max_width: WidthOptions.MEDIUM,
          body: [
            {
              response_type: "text",
              text: "##### Task with max_width: WidthOptions.MEDIUM on card",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          source:
                            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/example_avatar_1.png",
                          response_type: "image",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Matt Hidinger**\nCreated Tue, Feb 14, 2017",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "40px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
            {
              response_type: "text",
              text: "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Board:**\n**List:**\n**Assigned to:**\n**Due date:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "Adaptive Cards\nBacklog\nMatt Hidinger\nNot set",
                        },
                      ],
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "84px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
          ],
          footer: [
            {
              url: "https://adaptivecards.io/",
              kind: "secondary",
              label: "View",
              button_type: "url",
              response_type: "button",
            },
          ],
          response_type: "card",
        } as unknown as GenericItem,
        {
          max_width: WidthOptions.LARGE,
          body: [
            {
              response_type: "text",
              text: "##### Task with max_width: WidthOptions.LARGE on card",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          source:
                            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/example_avatar_1.png",
                          response_type: "image",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Matt Hidinger**\nCreated Tue, Feb 14, 2017",
                        },
                      ],
                      vertical_alignment: "center",
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "40px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
            {
              response_type: "text",
              text: "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "**Board:**\n**List:**\n**Assigned to:**\n**Due date:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: "text",
                          text: "Adaptive Cards\nBacklog\nMatt Hidinger\nNot set",
                        },
                      ],
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: "84px",
                },
                {
                  width: "1",
                },
              ],
              response_type: "grid",
            },
          ],
          footer: [
            {
              url: "https://adaptivecards.io/",
              kind: "secondary",
              label: "View",
              button_type: "url",
              response_type: "button",
            },
          ],
          response_type: "card",
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doCard };
