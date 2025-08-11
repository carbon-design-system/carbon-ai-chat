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
  MessageResponseTypes,
  WidthOptions,
} from "@carbon/ai-chat";

function doGrid(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can use the grid response type to do more complicated layouts of content on a grid. Be sure to take note of user_defined response types as your layout gets more complex.",
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.SMALL",
        },
        {
          max_width: WidthOptions.SMALL,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
          response_type: MessageResponseTypes.GRID,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.MEDIUM",
        },
        {
          max_width: WidthOptions.MEDIUM,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
          response_type: MessageResponseTypes.GRID,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Grid alignment example with max_width: WidthOptions.LARGE",
        },
        {
          max_width: WidthOptions.LARGE,
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "**top**\ncenter\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\n**center**\nbottom",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "center",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
                      response_type: MessageResponseTypes.TEXT,
                      text: "top\ncenter\n**bottom**",
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "left",
                    },
                  ],
                  vertical_alignment: "bottom",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "center",
                    },
                  ],
                  vertical_alignment: "bottom",
                  horizontal_alignment: "center",
                },
                {
                  items: [
                    {
                      response_type: MessageResponseTypes.TEXT,
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
          response_type: MessageResponseTypes.GRID,
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: "#### Using the grid to control the width of a single response type (Video set to SMALL here)",
        },
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
          response_type: MessageResponseTypes.GRID,
        },
      ],
    },
  });
}

export { doGrid };
