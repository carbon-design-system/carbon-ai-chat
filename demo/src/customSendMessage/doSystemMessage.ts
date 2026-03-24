/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes } from "@carbon/ai-chat";
import { MARKDOWN } from "./constants";

function doSystemMessage(instance: ChatInstance, inline?: boolean) {
  if (inline) {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "Monday, June 14th 2025",
          },
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  } else {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.SYSTEM,
            title: "Monday, June 14th 2025",
          },
        ],
      },
    });

    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: MARKDOWN,
          },
        ],
      },
    });
  }
}

export { doSystemMessage };
