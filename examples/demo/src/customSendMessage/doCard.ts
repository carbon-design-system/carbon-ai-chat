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

import { ChatInstance, GenericItem } from '@carbon/ai-chat';

function doCard(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          body: [
            {
              response_type: 'text',
              text: '##### Publish Adaptive Card Schema',
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          source: 'https://web-chat.assistant.test.watson.cloud.ibm.com/assets/example_avatar_1.png',
                          response_type: 'image',
                        },
                      ],
                      vertical_alignment: 'center',
                    },
                    {
                      items: [
                        {
                          response_type: 'text',
                          text: '**Matt Hidinger**\nCreated Tue, Feb 14, 2017',
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
            {
              response_type: 'text',
              text: 'Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.',
            },
            {
              rows: [
                {
                  cells: [
                    {
                      items: [
                        {
                          response_type: 'text',
                          text: '**Board:**\n**List:**\n**Assigned to:**\n**Due date:**',
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          response_type: 'text',
                          text: 'Adaptive Cards\nBacklog\nMatt Hidinger\nNot set',
                        },
                      ],
                    },
                  ],
                },
              ],
              columns: [
                {
                  width: '84px',
                },
                {
                  width: '1',
                },
              ],
              response_type: 'grid',
            },
          ],
          footer: [
            {
              url: 'https://adaptivecards.io/',
              kind: 'secondary',
              label: 'View',
              button_type: 'url',
              response_type: 'button',
            },
          ],
          response_type: 'card',
        } as unknown as GenericItem,
      ],
    },
  });
}

export { doCard };
