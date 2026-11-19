/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import VideoPlayer from './aichat-video-player.js';

export { default as VideoPlayer } from './aichat-video-player.js';

defineCustomElement(VideoPlayer);

export type { VideoPlayerErrorEventDetail } from './aichat-video-player.js';
