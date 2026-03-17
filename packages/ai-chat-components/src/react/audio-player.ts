/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAIChatAudioPlayer from "../components/audio-player/src/audio-player.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const AudioPlayer = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-audio-player",
    elementClass: CDSAIChatAudioPlayer,
    react: React,
    events: {
      onPlay: "cds-aichat-audio-player-play",
      onPause: "cds-aichat-audio-player-pause",
      onReady: "cds-aichat-audio-player-ready",
      onError: "cds-aichat-audio-player-error",
    },
  }),
);

export { AudioPlayer };
export default AudioPlayer;

// Made with Bob
