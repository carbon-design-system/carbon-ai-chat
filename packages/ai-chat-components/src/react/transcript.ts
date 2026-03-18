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
import TranscriptElement from "../components/audio-player/src/transcript.js";

const Transcript = createComponent({
  tagName: "cds-aichat-transcript",
  elementClass: TranscriptElement,
  react: React,
  events: {
    onTranscriptToggle: "cds-aichat-transcript-toggle",
  },
});

export { Transcript };
export default Transcript;

// Made with Bob
