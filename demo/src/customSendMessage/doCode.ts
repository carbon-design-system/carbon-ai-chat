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
  CustomSendMessageOptions,
  MessageResponseTypes,
} from '@carbon/ai-chat';

import { CODE } from './constants';
import { doTextStreaming } from './doText';

function doCode(instance: ChatInstance, requestID?: MessageRequest['id']) {
  instance.messaging.addMessage({
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: CODE,
        },
      ],
    },
  });
}

function doCodeStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
  requestID?: MessageRequest['id']
) {
  doTextStreaming(
    instance,
    CODE,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    requestOptions,
    requestID
  );
}

export { doCode, doCodeStreaming };
