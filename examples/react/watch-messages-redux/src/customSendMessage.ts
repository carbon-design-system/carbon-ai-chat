/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Controlled mock stream for the Watch / Messages (Redux Toolkit) example.
 *
 * The first upsert exposes partial content. The host's Finish response button
 * releases the gate and publishes the final snapshot.
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
  MessageState,
} from '@carbon/ai-chat';

let finishPendingResponse: (() => void) | null = null;
let responseCount = 0;

function finishResponse() {
  finishPendingResponse?.();
}

async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  if (!(request.input.text || '').trim()) {
    return;
  }

  responseCount += 1;
  const responseID = `watch-messages-redux-response-${responseCount}`;
  let releaseGate = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  finishPendingResponse = releaseGate;

  await instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    () => ({
      id: responseID,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'A partial response is visible.',
            streaming_metadata: { id: 'answer' },
          },
        ],
      },
    })
  );

  await gate;
  finishPendingResponse = null;

  await instance.messaging.upsertMessage(
    responseID,
    MessageState.COMPLETE,
    () => ({
      id: responseID,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'The response is complete.',
          },
        ],
      },
    })
  );
}

export { customSendMessage, finishResponse };
