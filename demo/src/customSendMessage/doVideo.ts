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
          response_type: MessageResponseTypes.TEXT,
          text: "You can display video from your own video files, or you can embed content from YouTube, Vimeo or Kaltura.",
        },
        {
          source: "https://vimeo.com/362850275",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from Vimeo",
        },
        {
          source: "https://www.youtube.com/watch?v=QuW4_bRHbUk",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from YouTube",
        },
        {
          source:
            "https://cdnapisec.kaltura.com/p/1773841/sp/177384100/embedIframeJs/uiconf_id/27941801/partner_id/1773841?iframeembed=true&entry_id=1_onstzigu",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from Kaltura",
          title: "Generative Models Explained",
          description:
            "(This video will fail to load as its scoped to ibm.com only)",
        },
      ],
    },
  });
}

function doVideoYouTube(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here's a video from YouTube:",
        },
        {
          source: "https://www.youtube.com/watch?v=QuW4_bRHbUk",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from YouTube",
        },
      ],
    },
  });
}

function doVideoVimeo(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here's a video from Vimeo:",
        },
        {
          source: "https://vimeo.com/362850275",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from Vimeo",
        },
      ],
    },
  });
}

function doVideoKaltura(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "Here's a video from Kaltura (note: this may fail to load as it's scoped to ibm.com only):",
        },
        {
          source:
            "https://cdnapisec.kaltura.com/p/1773841/sp/177384100/embedIframeJs/uiconf_id/27941801/partner_id/1773841?iframeembed=true&entry_id=1_onstzigu",
          response_type: MessageResponseTypes.VIDEO,
          alt_text: "Video from Kaltura",
          title: "Generative Models Explained",
          description:
            "(This video will fail to load as its scoped to ibm.com only)",
        },
      ],
    },
  });
}

export { doVideo, doVideoYouTube, doVideoVimeo, doVideoKaltura };
