/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  AudioItem,
  ChatInstance,
  MessageResponseTypes,
  TextItem,
} from "@carbon/ai-chat";

function doAudio(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can display audio for your own .mp3 files, or you can embed content from [SoundCloud](https://soundcloud.com/) or [Mixcloud](https://mixcloud.com/).",
        } as TextItem,
        {
          response_type: MessageResponseTypes.AUDIO,
          title: "An audio clip from SoundCloud",
          description: "This description and the title above are optional.",
          source: "https://soundcloud.com/kelab-gklm/baby-shark-do-do-do",
        } as AudioItem,
        {
          response_type: MessageResponseTypes.AUDIO,
          title: "Your own mp3 file",
          description: "This description and the title above are optional.",
          source:
            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/Teapot_Hasselhoff.mp3",
        } as AudioItem,
      ],
    },
  });
}

export { doAudio };
