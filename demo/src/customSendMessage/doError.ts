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
  InlineErrorItem,
  MessageResponseTypes,
} from "@carbon/ai-chat";

function doError(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.INLINE_ERROR,
        } as InlineErrorItem,
      ],
    },
  });
}

export { doError };
