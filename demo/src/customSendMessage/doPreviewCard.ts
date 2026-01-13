/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes } from "@carbon/ai-chat";

function doPreviewCard(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here is a plan for optimizing excess inventory.",
        },
        {
          title: "Optimizing excess inventory",
          subtitle: `Created on: ${new Date().toLocaleDateString()}`,
          response_type: MessageResponseTypes.PREVIEW_CARD,
          additional_data: {
            id: "some unique ID for the workspace",
            data: "some additional data for the workspace",
          },
        },
      ],
    },
  });
}

export { doPreviewCard };
