/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, DateItem, MessageResponseTypes } from "@carbon/ai-chat";

function doDate(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.DATE,
        } as DateItem,
      ],
    },
  });
}

export { doDate };
