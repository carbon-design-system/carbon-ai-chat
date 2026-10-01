/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ButtonItemType,
  CardItem,
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponse,
  MessageResponseTypes,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { BUTTON_KIND } from '@carbon/web-components/es/components/button/defs.js';

import { UPSERT_ITEM_DELAY } from './constants';
import { createResponseStream } from './sendResponse';

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function doCardStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions
) {
  const signal = requestOptions?.signal;
  const responseID = uuid();
  const stream = createResponseStream(instance, responseID);
  let isCanceled = Boolean(signal?.aborted);

  // Listen to abort signal (handles both stop button and restart/clear)
  const abortHandler = () => {
    isCanceled = true;
  };
  signal?.addEventListener('abort', abortHandler);

  try {
    await sleep(UPSERT_ITEM_DELAY);

    // A card streams as a whole item: send it as a complete item, with its body and footer, while the rest of the
    // response is still open. upsertMessage draws it at once; addMessageChunk holds it until the final response.
    const cardItem: CardItem = {
      response_type: MessageResponseTypes.CARD,
      body: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: '##### Streamed card',
        },
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'This card arrived as a complete item before the final response. With upsertMessage it draws at once; with addMessageChunk it waits for the final response.',
        },
      ],
      footer: [
        {
          url: 'https://carbondesignsystem.com/',
          kind: BUTTON_KIND.GHOST,
          label: 'View Carbon Docs',
          button_type: ButtonItemType.URL,
          response_type: MessageResponseTypes.BUTTON,
        },
      ],
      streaming_metadata: {
        // This is the id of the item inside the response.
        id: '1',
      },
    };

    if (!isCanceled) {
      stream.complete({
        complete_item: cardItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
      // Hold long enough to see the card mid-stream before final_response.
      await sleep(UPSERT_ITEM_DELAY);
    }

    // When all and any items are complete, you send a final response. What you send here is what the chat will
    // display when streaming has been completed.
    const finalResponse: MessageResponse = {
      id: responseID,
      output: {
        generic: [
          {
            ...cardItem,
            streaming_metadata: { id: '1', stream_stopped: isCanceled },
          },
        ],
      },
    };

    await stream.final(finalResponse);
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }
}

export { doCardStreaming };
