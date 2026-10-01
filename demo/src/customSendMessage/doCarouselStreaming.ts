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
  CarouselItem,
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponseTypes,
} from '@carbon/ai-chat';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { MessageState } from '@carbon/ai-chat/server';

import { UPSERT_ITEM_DELAY } from './constants';

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// The three cards that arrive one by one while the stream is open.
const CAROUSEL_CARDS: CarouselItem['items'] = [
  {
    response_type: MessageResponseTypes.CARD,
    body: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: '##### Peach Colored Blouse',
      },
      {
        response_type: MessageResponseTypes.TEXT,
        text: "I'm baby beard cornhole gatekeep, lyft hoodie disrupt locavore raw denim meggings.",
      },
      { response_type: MessageResponseTypes.TEXT, text: '#### $59.99' },
    ],
    footer: [
      {
        label: 'Select',
        button_type: ButtonItemType.CUSTOM_EVENT,
        custom_event_name: 'alert_button',
        user_defined: { text: 'You selected Peach Colored Blouse!' },
        response_type: MessageResponseTypes.BUTTON,
      },
    ],
  },
  {
    response_type: MessageResponseTypes.CARD,
    body: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: '##### Green Leopard Jacket',
      },
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Street art banjo vaporware, hot chicken marxism art party neutra quinoa sustainable activated charcoal.',
      },
      {
        response_type: MessageResponseTypes.TEXT,
        text: '#### ~~$179.99~~ $29.99',
      },
    ],
    footer: [
      {
        label: 'Select',
        button_type: ButtonItemType.CUSTOM_EVENT,
        custom_event_name: 'alert_button',
        user_defined: { text: 'You selected Green Leopard Jacket!' },
        response_type: MessageResponseTypes.BUTTON,
      },
    ],
  },
  {
    response_type: MessageResponseTypes.CARD,
    body: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: '##### Yellow Wool Hat',
      },
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Succulents skateboard adaptogen solarpunk semiotics, viral locavore palo santo.',
      },
      { response_type: MessageResponseTypes.TEXT, text: '#### $29.99' },
    ],
    footer: [
      {
        label: 'Select',
        button_type: ButtonItemType.CUSTOM_EVENT,
        custom_event_name: 'alert_button',
        user_defined: { text: 'You selected Yellow Wool Hat!' },
        response_type: MessageResponseTypes.BUTTON,
      },
    ],
  },
];

async function doCarouselStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions
) {
  const signal = requestOptions?.signal;
  const responseID = uuid();
  let isCanceled = Boolean(signal?.aborted);

  const abortHandler = () => {
    isCanceled = true;
  };
  signal?.addEventListener('abort', abortHandler);

  try {
    // Send each card as a successive STREAMING upsert so the carousel grows
    // one card at a time. The whole item is held until final_response in
    // addMessageChunk mode, so this entry only appears in the upsertMessage
    // response map.
    const builtItems: CarouselItem['items'] = [];
    for (const card of CAROUSEL_CARDS) {
      if (isCanceled) {
        break;
      }
      await sleep(UPSERT_ITEM_DELAY);
      if (isCanceled) {
        break;
      }
      builtItems.push(card);
      const carousel: CarouselItem = {
        response_type: MessageResponseTypes.CAROUSEL,
        items: [...builtItems],
        streaming_metadata: { id: '1' },
      };
      await instance.messaging.upsertMessage(
        responseID,
        MessageState.STREAMING,
        () => ({
          id: responseID,
          output: { generic: [carousel] },
        })
      );
    }

    const finalCarousel: CarouselItem = {
      response_type: MessageResponseTypes.CAROUSEL,
      items: [...builtItems],
      streaming_metadata: {
        id: '1',
        stream_stopped: isCanceled,
      },
    };

    await instance.messaging.upsertMessage(
      responseID,
      MessageState.COMPLETE,
      () => ({
        id: responseID,
        output: { generic: [finalCarousel] },
      })
    );
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }
}

export { doCarouselStreaming };
