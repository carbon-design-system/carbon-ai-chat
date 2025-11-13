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
          title: "Small preview card",
          subtitle: "subtitle",
          response_type: MessageResponseTypes.PREVIEW_CARD,
        },
        // {
        //   title: "Large preview card",
        //   subtitle: "subtitle",
        //   max_width: WidthOptions.LARGE,
        //   response_type: MessageResponseTypes.PREVIEW_CARD,
        //   // ai label
        //   toolbar_actions: {
        //     // version
        //     // download
        //     // share
        //     // open
        //   },
        // },
        // {
        //   title: "Large preview card with steps",
        //   max_width: WidthOptions.LARGE,
        //   response_type: MessageResponseTypes.PREVIEW_CARD,
        //   // ai label
        // },
      ],
    },
  });
}

export { doPreviewCard };
