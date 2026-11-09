/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { VideoPlayer as CDSAIChatVideoPlayer } from '../components/aichat-video-player/index.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const VideoPlayer = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatVideoPlayer.is,
    elementClass: CDSAIChatVideoPlayer,
    react: React,
    events: {
      onPlay: 'cds-aichat-video-player-play',
      onPause: 'cds-aichat-video-player-pause',
      onReady: 'cds-aichat-video-player-ready',
      onError: 'cds-aichat-video-player-error',
    },
  })
);

export { VideoPlayer };
export default VideoPlayer;
