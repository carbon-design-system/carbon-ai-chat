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
import CDSAIChatVideoPlayer from "../components/video-player/src/video-player.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const VideoPlayer = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-video-player",
    elementClass: CDSAIChatVideoPlayer,
    react: React,
    events: {
      onPlay: "cds-aichat-video-player-play",
      onPause: "cds-aichat-video-player-pause",
      onReady: "cds-aichat-video-player-ready",
      onError: "cds-aichat-video-player-error",
    },
  }),
);

export { VideoPlayer };
export default VideoPlayer;

// Made with Bob
