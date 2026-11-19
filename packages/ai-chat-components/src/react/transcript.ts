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
import { Transcript as TranscriptElement } from '../components/aichat-audio-player/index.js';
import type { TranscriptToggleEventDetail } from '../components/aichat-audio-player/index.js';

const Transcript = createComponent({
  tagName: TranscriptElement.is,
  elementClass: TranscriptElement,
  react: React,
  events: {
    onTranscriptToggle: 'cds-aichat-transcript-toggle' as EventName<
      CustomEvent<TranscriptToggleEventDetail>
    >,
  },
  displayName: 'Transcript',
});

export { Transcript };
export default Transcript;
