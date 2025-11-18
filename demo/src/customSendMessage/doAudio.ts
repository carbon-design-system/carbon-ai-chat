/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, MessageResponseTypes } from "@carbon/ai-chat";

function doAudio(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "You can display audio for your own .mp3 files, or you can embed content from [SoundCloud](https://soundcloud.com/). For raw audio files, you can also provide a text transcript for accessibility.",
        },
        {
          response_type: MessageResponseTypes.AUDIO,
          title: "An audio clip from SoundCloud",
          description: "This description and the title above are optional.",
          source: "https://soundcloud.com/kelab-gklm/baby-shark-do-do-do",
        },
        {
          response_type: MessageResponseTypes.AUDIO,
          title: "Your own mp3 file with transcript",
          description: "This example includes a transcript for accessibility.",
          source:
            "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/Teapot_Hasselhoff.mp3",
          file_accessibility: {
            transcript: {
              text: "My text input is, you know, I am a teapot and then my image input is a picture of David Hasselhoff.",
              language: "en",
              label: "English Transcript",
            },
          },
        },
      ],
    },
  });
}

export { doAudio };
