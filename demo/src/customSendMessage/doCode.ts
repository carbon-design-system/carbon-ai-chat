/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponseTypes,
} from "@carbon/ai-chat";

import { CODE } from "./constants";
import { doTextStreaming } from "./doText";

function doCode(instance: ChatInstance) {
  instance.messaging.addMessage({
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
) {
  doTextStreaming(
    instance,
    CODE,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    requestOptions,
  );
}

export { doCode, doCodeStreaming };
