/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes, VideoItem } from "@carbon/ai-chat";

function doVideo(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          source: "https://vimeo.com/118761396",
          response_type: MessageResponseTypes.VIDEO,
          dimensions: {
            base_height: 126,
          },
        } as VideoItem,
        {
          source: "https://www.youtube.com/watch?v=y_6hQOUx-dg",
          response_type: MessageResponseTypes.VIDEO,
        } as VideoItem,
      ],
    },
  });
}

export { doVideo };
