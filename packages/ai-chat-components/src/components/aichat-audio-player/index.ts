/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-markdown/index.js';
import AudioPlayer from './aichat-audio-player.js';
import Transcript from './aichat-transcript.js';

export { default as AudioPlayer } from './aichat-audio-player.js';
export { default as Transcript } from './aichat-transcript.js';

defineCustomElement(AudioPlayer);
defineCustomElement(Transcript);

export type { AudioPlayerErrorEventDetail } from './aichat-audio-player.js';

export type { TranscriptToggleEventDetail } from './aichat-transcript.js';
