/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes } from "@carbon/ai-chat";

function doVideo(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          source: "https://vimeo.com/362850275",
          response_type: MessageResponseTypes.VIDEO,
          dimensions: {
            base_height: 126,
          },
        },
        {
          source: "https://www.youtube.com/watch?v=QuW4_bRHbUk",
          response_type: MessageResponseTypes.VIDEO,
        },
      ],
    },
  });
}

export { doVideo };
