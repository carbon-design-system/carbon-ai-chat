/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes, TextItem } from "@carbon/ai-chat";

import { CODE } from "./constants";
import { doTextStreaming } from "./doText";

function doCode(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: CODE,
        } as TextItem,
      ],
    },
  });
}

function doCodeStreaming(instance: ChatInstance) {
  doTextStreaming(instance, CODE, true);
}

export { doCode, doCodeStreaming };
