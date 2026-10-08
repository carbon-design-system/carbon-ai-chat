/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponse,
  MessageResponseTypes,
  UserDefinedItem,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

import { createResponseStream, sendResponse } from './sendResponse';

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const FAKE_DATA = `Some text that came from the server inside the user_defined object. Bacon ipsum dolor amet salami capicola chislic, meatball tail beef ham hock brisket cow ground round chuck. Turkey pork loin pastrami, ribeye jerky meatball drumstick kielbasa corned beef shankle picanha. Spare ribs leberkas hamburger strip steak beef ribs sirloin brisket capicola, sausage meatball drumstick ham swine alcatra. Pastrami filet mignon salami, flank short loin t-bone tenderloin ribeye brisket.`;

function doUserDefined(instance: ChatInstance) {
  return sendResponse(instance, {
    id: uuid(),
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: {
            user_defined_type: 'green',
            text: FAKE_DATA,
          },
        },
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: {
            user_defined_type: 'green',
            text: 'As full width',
          },
          full_width: true,
        },
      ],
    },
  });
}

async function doUserDefinedStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions
) {
  const signal = requestOptions?.signal;
  const WORD_DELAY = 50;
  const responseID = uuid();
  const stream = createResponseStream(instance, responseID);
  const words = FAKE_DATA.split(' ');
  let isCanceled = false;

  // Listen to abort signal (handles both stop button and restart/clear)
  const abortHandler = () => {
    isCanceled = true;
  };
  signal?.addEventListener('abort', abortHandler);

  try {
    for (let index = 0; index < words.length && !isCanceled; index++) {
      const word = words[index];

      await sleep(WORD_DELAY);
      // Each time you get a chunk back, pass it to the stream. With addMessageChunk the chat appends the chunks itself.
      // With upsertMessage the helper in sendResponse.ts keeps the running text and sends the whole message each time.
      stream.partial({
        partial_item: {
          response_type: MessageResponseTypes.USER_DEFINED,
          // The next chunk. Only the new text goes here, in either mode.
          user_defined: {
            user_defined_type: 'green',
            text: `${word},`,
          },
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: '1',
            cancellable: true,
          },
        },
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }

    // When you are done streaming this item in the response, you should send the complete item.
    // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
    // else that mutates the data, you can do so here.
    const completeItem: UserDefinedItem = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: {
        user_defined_type: isCanceled ? '' : 'green',
        text: FAKE_DATA,
      },
      streaming_metadata: {
        // This is the id of the item inside the response.
        id: '1',
        stream_stopped: isCanceled,
      },
    };

    if (!isCanceled) {
      stream.complete({
        complete_item: completeItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }

    // When all and any chunks are complete, you send a final response.
    // You can rearrange or re-write everything here, but what you send here is what the chat will display when streaming
    // has been completed.
    const finalResponse: MessageResponse = {
      id: responseID,
      output: {
        generic: [completeItem],
      },
    };

    await stream.final(finalResponse);
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }
}

export { doUserDefined, doUserDefinedStreaming };
