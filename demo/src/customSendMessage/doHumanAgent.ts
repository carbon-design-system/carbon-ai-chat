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
  MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

function doHumanAgent(
  instance: ChatInstance,
  requestID?: MessageRequest['id']
) {
  instance.messaging.addMessage({
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
        },
      ],
    },
  });
}

export { doHumanAgent };
