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
  WidthOptions,
} from "@carbon/ai-chat";
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/defs.js";

function doCard(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          body: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "##### Carbon Design System Component",
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: "The Carbon Design System provides a comprehensive library of components, tokens, and guidelines. We need to implement the new AI Chat component following Carbon's design principles and accessibility standards.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "**Release:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "v11.45.0",
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
                {
                  width: "1",
                },
              ],
              response_type: MessageResponseTypes.GRID,
            },
          ],
          footer: [
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.PRIMARY,
              label: "OK",
              button_type: ButtonItemType.CUSTOM_EVENT,
              response_type: MessageResponseTypes.BUTTON,
              custom_event_name: "alert_button",
              // Pass any extra meta data you want here and it will be included in the event payload.
              user_defined: {
                text: "OK!",
              },
            },
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.DANGER,
              label: "Cancel",
              button_type: ButtonItemType.CUSTOM_EVENT,
              response_type: MessageResponseTypes.BUTTON,
              custom_event_name: "alert_button",
              // Pass any extra meta data you want here and it will be included in the event payload.
              user_defined: {
                text: "Cancel!",
              },
            },
          ],
          response_type: MessageResponseTypes.CARD,
        },
        {
          max_width: WidthOptions.SMALL,
          body: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "##### Carbon Component with max_width: WidthOptions.SMALL on card",
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: "The Carbon Design System provides a comprehensive library of components, tokens, and guidelines. We need to implement the new AI Chat component following Carbon's design principles and accessibility standards.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "**Release:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "v11.45.0",
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
                {
                  width: "1",
                },
              ],
              response_type: MessageResponseTypes.GRID,
            },
          ],
          footer: [
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.GHOST,
              label: "View Carbon Docs",
              button_type: ButtonItemType.URL,
              response_type: MessageResponseTypes.BUTTON,
            },
          ],
          response_type: MessageResponseTypes.CARD,
        },
        {
          max_width: WidthOptions.MEDIUM,
          body: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "##### Carbon Component with max_width: WidthOptions.MEDIUM on card",
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: "The Carbon Design System provides a comprehensive library of components, tokens, and guidelines. We need to implement the new AI Chat component following Carbon's design principles and accessibility standards.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "**Release:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "v11.45.0",
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
                {
                  width: "1",
                },
              ],
              response_type: MessageResponseTypes.GRID,
            },
          ],
          footer: [
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.GHOST,
              label: "View Carbon Docs",
              button_type: ButtonItemType.URL,
              response_type: MessageResponseTypes.BUTTON,
            },
          ],
          response_type: MessageResponseTypes.CARD,
        },
        {
          max_width: WidthOptions.LARGE,
          body: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "##### Carbon Component with max_width: WidthOptions.LARGE on card",
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: "The Carbon Design System provides a comprehensive library of components, tokens, and guidelines. We need to implement the new AI Chat component following Carbon's design principles and accessibility standards.",
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "**Release:**",
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: MessageResponseTypes.TEXT,
                          text: "v11.45.0",
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
                {
                  width: "1",
                },
              ],
              response_type: MessageResponseTypes.GRID,
            },
          ],
          footer: [
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.GHOST,
              label: "View Carbon Docs 1",
              button_type: ButtonItemType.URL,
              response_type: MessageResponseTypes.BUTTON,
            },
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.GHOST,
              label: "View Carbon Docs 2",
              button_type: ButtonItemType.URL,
              response_type: MessageResponseTypes.BUTTON,
            },
            {
              url: "https://ibm.com/",
              kind: BUTTON_KIND.GHOST,
              label: "View Carbon Docs 3",
              button_type: ButtonItemType.URL,
              response_type: MessageResponseTypes.BUTTON,
            },
          ],
          response_type: MessageResponseTypes.CARD,
        },
      ],
    },
  });
}

export { doCard };
