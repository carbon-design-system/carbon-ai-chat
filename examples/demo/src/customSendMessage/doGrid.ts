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

import { ChatInstance, GenericItem, MessageResponseTypes, TextItem } from '@carbon/ai-chat';

function doGrid(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: '#### Grid alignment example:',
        } as TextItem,
        {
          rows: [
            {
              cells: [
                {
                  items: [
                    {
                      response_type: 'text',
                      text: '**top**\ncenter\nbottom',
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'left',
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'center',
                    },
                  ],
                  horizontal_alignment: 'center',
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'right',
                    },
                  ],
                  horizontal_alignment: 'right',
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'top\n**center**\nbottom',
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'left',
                    },
                  ],
                  vertical_alignment: 'center',
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'center',
                    },
                  ],
                  vertical_alignment: 'center',
                  horizontal_alignment: 'center',
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'right',
                    },
                  ],
                  vertical_alignment: 'center',
                  horizontal_alignment: 'right',
                },
              ],
            },
            {
              cells: [
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'top\ncenter\n**bottom**',
                    },
                  ],
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'left',
                    },
                  ],
                  vertical_alignment: 'bottom',
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'center',
                    },
                  ],
                  vertical_alignment: 'bottom',
                  horizontal_alignment: 'center',
                },
                {
                  items: [
                    {
                      response_type: 'text',
                      text: 'right',
                    },
                  ],
                  vertical_alignment: 'bottom',
                  horizontal_alignment: 'right',
                },
              ],
            },
          ],
          columns: [
            {
              width: '50px',
            },
            {
              width: '1',
            },
            {
              width: '1',
            },
            {
              width: '1',
            },
          ],
          response_type: 'grid',
        } as unknown as GenericItem,
        {
          response_type: MessageResponseTypes.TEXT,
          text: '#### Grid Lendyr example:',
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
                                    'https://web-chat.global.assistant.watson.appdomain.cloud/assets/Lendyr-Avatar.png',
                                  response_type: 'image',
                                },
                              ],
                            },
                            {
                              items: [
                                {
                                  response_type: 'text',
                                  text: 'IBM **watsonx Assistant Demo Site**\n[https://lendyr.com](https://lendyr.com)',
                                },
                              ],
                              vertical_alignment: 'center',
                            },
                          ],
                        },
                      ],
                      columns: [
                        {
                          width: '40px',
                        },
                        {
                          width: '1',
                        },
                      ],
                      response_type: 'grid',
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
                      response_type: 'text',
                      text: 'Learn how IBM watsonx Assistant can be used to create powerful experiences that help customers actually resolve their problems.',
                    },
                  ],
                },
              ],
            },
          ],
          columns: [
            {
              width: '1',
            },
          ],
          response_type: 'grid',
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doGrid };
