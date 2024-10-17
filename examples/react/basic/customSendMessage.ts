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

import { ChatInstance, CustomSendMessageOptions, GenericItem, MessageRequest, StreamChunk } from '@carbon/ai-chat';

const WELCOME_TEXT = `Welcome to this example of a custom backend. This backend is mocked entirely on the client side. It does not show all potential functionality.

You can try the following responses:

- stream text
- text
- user_defined
`;

const TEXT =
  `Lorem ipsum odor amet, consectetuer adipiscing elit. \`Inline Code Venenatis\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam scelerisque platea ridiculus sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.

| Lorem        | Ipsum      | Odor    | Amet      |
|--------------|------------|---------|-----------|
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |


- consectetuer
- adipiscing
- elit
- Venenatis

` +
  '\n```python\n' +
  `import random

def generate_lorem_ipsum(paragraphs=1):
    # Base words for Lorem Ipsum
    lorem_words = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
        "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "
        "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure "
        "dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt "
        "mollit anim id est laborum."
    ).split()
    
    # Function to generate a random sentence
    def random_sentence():
        sentence_length = random.randint(4, 12)
        sentence = random.sample(lorem_words, sentence_length)
        return " ".join(sentence).capitalize() + "."
    
    # Function to generate a paragraph
    def random_paragraph():
        sentence_count = random.randint(3, 6)
        return " ".join(random_sentence() for _ in range(sentence_count))
    
    # Generate the requested number of paragraphs
    return "\\n\\n".join(random_paragraph() for _ in range(paragraphs))

# Example usage
print(generate_lorem_ipsum(2))  # Generates 2 paragraphs of Lorem Ipsum text
` +
  '\n\n```';

const CHART_DATA = JSON.stringify({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { category: 'A', value: 20 },
      { category: 'B', value: 40 },
      { category: 'C', value: 60 },
    ],
  },
  mark: 'bar',
  encoding: {
    x: { field: 'category', type: 'nominal', axis: { title: 'Category' } },
    y: { field: 'value', type: 'quantitative', axis: { title: 'Value' } },
  },
});

const WORD_DELAY = 40;

async function doFakeTextStreaming(instance: ChatInstance) {
  const responseID = crypto.randomUUID();
  const words = TEXT.split(' ');

  words.forEach((word, index) => {
    setTimeout(() => {
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: 'text',
          text: `${word} `,
          streaming_metadata: {
            id: '1',
          },
        } as GenericItem,
        streaming_metadata: {
          response_id: responseID,
        },
      });
    }, index * WORD_DELAY);
  });

  await sleep(words.length * WORD_DELAY);

  const completeItem = {
    response_type: 'text',
    text: `${TEXT}\n\nMore stuff on the end when adding as a complete item.`,
    streaming_metadata: {
      id: '1',
    },
  };
  instance.messaging.addMessageChunk({
    complete_item: completeItem,
    streaming_metadata: {
      response_id: responseID,
    },
  } as StreamChunk);

  const finalResponse = {
    id: responseID,
    output: {
      generic: [completeItem],
    },
  };

  instance.messaging.addMessageChunk({
    final_response: finalResponse,
  } as StreamChunk);
}

async function sleep(milliseconds: number) {
  await new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

async function customSendMessage(
  request: MessageRequest,
  requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  if (request.input.text === '') {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: 'text',
            text: WELCOME_TEXT,
          } as GenericItem,
        ],
      },
    });
  } else {
    switch (request.input.text) {
      case 'text':
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: 'text',
                text: TEXT,
              } as GenericItem,
            ],
          },
        });
        break;
      case 'user_defined':
        instance.messaging.addMessage({
          output: {
            generic: [
              /* {
                response_type: 'text',
                text: 'Rendering the chart component from [Carbon Labs](https://labs-canary.carbondesignsystem.com/?path=/docs/components-chart--chart).',
              } as GenericItem, */
              {
                response_type: 'user_defined',
                user_defined: {
                  type: 'chart',
                  chart_data: CHART_DATA,
                },
              } as GenericItem,
            ],
          },
        });
        break;
      case 'stream text':
        doFakeTextStreaming(instance as ChatInstance);
        break;
      default:
        instance.messaging.addMessage({
          output: {
            generic: [
              {
                response_type: 'text',
                text: WELCOME_TEXT,
              } as GenericItem,
            ],
          },
        });
    }
  }
}

export { customSendMessage };
