/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { VideoPlayer as CDSAIChatVideoPlayer } from '../components/aichat-video-player/index.js';
import type { VideoPlayerErrorEventDetail } from '../components/aichat-video-player/index.js';

const VideoPlayer = createComponent({
  tagName: CDSAIChatVideoPlayer.is,
  elementClass: CDSAIChatVideoPlayer,
  react: React,
  events: {
    onPlay: 'cds-aichat-video-player-play' as EventName<CustomEvent<null>>,
    onPause: 'cds-aichat-video-player-pause' as EventName<CustomEvent<null>>,
    onReady: 'cds-aichat-video-player-ready' as EventName<CustomEvent<null>>,
    onError: 'cds-aichat-video-player-error' as EventName<
      CustomEvent<VideoPlayerErrorEventDetail>
    >,
  },
});

export { VideoPlayer };
export default VideoPlayer;
