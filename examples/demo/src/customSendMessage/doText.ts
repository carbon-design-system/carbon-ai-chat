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

import { ChatInstance, MessageResponseTypes, OptionItem, StreamChunk, TextItem } from '@carbon/ai-chat';

import { sleep } from '../framework/utils';
import { MARKDOWN_WITH_SOURCE, WELCOME_TEXT, WORD_DELAY } from './constants';
import { RESPONSE_MAP } from './responseMap';

async function doTextStreaming(instance: ChatInstance, text: string = MARKDOWN_WITH_SOURCE) {
  const responseID = crypto.randomUUID();
  const words = text.split(' ');

  words.forEach((word, index) => {
    setTimeout(() => {
      // Each time you get a chunk back, you can call `addMessageChunk`.
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: '1',
          },
        } as TextItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }, index * WORD_DELAY);
  });

  await sleep((words.length + 1) * WORD_DELAY);

  // When you are done streaming this item in the response, you should call the complete item.
  // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
  // else that mutates the data, you can do so here.
  const completeItem = {
    response_type: MessageResponseTypes.TEXT,
    text,
    streaming_metadata: {
      // This is the id of the item inside the response.
      id: '1',
    },
  };
  instance.messaging.addMessageChunk({
    complete_item: completeItem,
    streaming_metadata: {
      // This is the id of the entire message response.
      response_id: responseID,
    },
  } as StreamChunk);

  // When all and any chunks are complete, you send a final response.
  // You can rearrange or re-write everything here, but what you send here is what the chat will display when streaming
  // has been completed.
  const finalResponse = {
    id: responseID,
    output: {
      generic: [completeItem],
    },
  };

  await instance.messaging.addMessageChunk({
    final_response: finalResponse,
  } as StreamChunk);
}

function doWelcomeText(instance: ChatInstance) {
  const options = Object.keys(RESPONSE_MAP).map(key => ({ label: key, value: { input: { text: key } } }));
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: WELCOME_TEXT,
        } as TextItem,
        {
          response_type: MessageResponseTypes.OPTION,
          title: 'Select a response to view it in action.',
          options,
        } as OptionItem,
      ],
    },
  });
}

function doText(instance: ChatInstance, text: string = MARKDOWN_WITH_SOURCE) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text,
        } as TextItem,
      ],
    },
  });
}

export { doTextStreaming, doWelcomeText, doText };
