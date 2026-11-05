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

import { AudioPlayer as CDSAIChatAudioPlayer } from '../components/aichat-audio-player/index.js';
import type { AudioPlayerErrorEventDetail } from '../components/aichat-audio-player/index.js';

const AudioPlayer = createComponent({
  tagName: CDSAIChatAudioPlayer.is,
  elementClass: CDSAIChatAudioPlayer,
  react: React,
  events: {
    onPlay: 'cds-aichat-audio-player-play' as EventName<CustomEvent<null>>,
    onPause: 'cds-aichat-audio-player-pause' as EventName<CustomEvent<null>>,
    onReady: 'cds-aichat-audio-player-ready' as EventName<CustomEvent<null>>,
    onError: 'cds-aichat-audio-player-error' as EventName<
      CustomEvent<AudioPlayerErrorEventDetail>
    >,
  },
});

export { AudioPlayer };
export default AudioPlayer;
