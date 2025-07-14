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
  WidthOptions,
} from "@carbon/ai-chat";

function doGrid(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid Lendyr example:",
        } as TextItem,
        {
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      rows: [
                        {
                          cells: [
                            {
                              items: [
                                {
                                  source:
                                    "https://web-chat.global.assistant.watson.appdomain.cloud/assets/Lendyr-Avatar.png",
                                  response_type: "image",
                                },
                              ],
                            },
                            {
                              items: [
                                {
                                  response_type: "text",
                                  text: "IBM **watsonx Assistant Demo Site**\n[https://lendyr.com](https://lendyr.com)",
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
                  ],
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "Learn how IBM watsonx Assistant can be used to create powerful experiences that help customers actually resolve their problems.",
                    },
                  ],
                },
              ],
            },
          ],
          columns: [
            {
              width: "1",
            },
          ],
          response_type: "grid",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.SMALL",
        } as TextItem,
        {
          max_width: WidthOptions.SMALL,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "right",
                },
              ],
            },
          ],
          columns: [
            {
              width: "50px",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
          ],
          response_type: "grid",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.MEDIUM",
        } as TextItem,
        {
          max_width: WidthOptions.MEDIUM,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "right",
                },
              ],
            },
          ],
          columns: [
            {
              width: "50px",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
          ],
          response_type: "grid",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.LARGE",
        } as TextItem,
        {
          max_width: WidthOptions.LARGE,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "right",
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: "text",
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: "text",
                      text: "right",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "right",
                },
              ],
            },
          ],
          columns: [
            {
              width: "50px",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
            {
              width: "1",
            },
          ],
          response_type: "grid",
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Using the grid to control the width of a single response type (Video set to SMALL here)",
        } as TextItem,
        {
          max_width: WidthOptions.SMALL,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      source: "https://vimeo.com/118761396",
                      response_type: MessageResponseTypes.VIDEO,
                      dimensions: {
                        base_height: 126,
                      },
                    },
                  ],
                },
              ],
            },
          ],
          columns: [
            {
              width: "1",
            },
          ],
          response_type: "grid",
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doGrid };
