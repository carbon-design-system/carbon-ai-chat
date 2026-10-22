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

import { AudioPlayer as CDSAIChatAudioPlayer } from '../components/aichat-audio-player/index.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const AudioPlayer = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatAudioPlayer.is,
    elementClass: CDSAIChatAudioPlayer,
    react: React,
    events: {
      onPlay: 'cds-aichat-audio-player-play',
      onPause: 'cds-aichat-audio-player-pause',
      onReady: 'cds-aichat-audio-player-ready',
      onError: 'cds-aichat-audio-player-error',
    },
  })
);

export { AudioPlayer };
export default AudioPlayer;
