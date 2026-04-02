/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../index";
import { html } from "lit";

export default {
  title: "Preview/Audio player/Transcript",
  args: {
    text: "My text input is, you know, I am a teapot and then my image input is a picture of David Hasselhoff.",
    label: "English Transcript",
    language: "en",
  },
  argTypes: {
    text: {
      control: "text",
      description: "The transcript text content (supports markdown)",
    },
    label: {
      control: "text",
      description: "Label for the transcript toggle button",
    },
    language: {
      control: "text",
      description: "Language code for the transcript (e.g., 'en', 'es')",
    },
  },
};

export const Default = {
  render: (args) => {
    const { text, label, language } = args;

    return html`
      <cds-aichat-transcript text=${text} label=${label} language=${language}>
      </cds-aichat-transcript>
    `;
  },
};

export const LongTranscript = {
  args: {
    text: `This is a much longer transcript that demonstrates how the component handles extensive content. 

The transcript component is designed to be collapsible, allowing users to expand and view the full content when needed, while keeping the interface clean and uncluttered by default.

**Key Features:**
- Expandable/collapsible interface
- Markdown support for formatting
- Accessibility-focused design
- Clean visual presentation

This makes it ideal for providing detailed transcripts of audio content without overwhelming the user interface. Users can choose to read the transcript when they need it, making the content more accessible to those who prefer or require text-based alternatives to audio.`,
    label: "Full Transcript",
    language: "en",
  },
  render: (args) => {
    const { text, label, language } = args;

    return html`
      <cds-aichat-transcript text=${text} label=${label} language=${language}>
      </cds-aichat-transcript>
    `;
  },
};

export const WithAudioPlayer = {
  args: {
    audioSource:
      "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/Teapot_Hasselhoff.mp3",
    audioTitle: "Your own mp3 file with transcript",
    audioDescription: "This example includes a transcript for accessibility.",
    text: "My text input is, you know, I am a teapot and then my image input is a picture of David Hasselhoff.",
    label: "English Transcript",
    language: "en",
  },
  argTypes: {
    audioSource: {
      control: "text",
      description: "Audio source URL",
    },
    audioTitle: {
      control: "text",
      description: "Audio title",
    },
    audioDescription: {
      control: "text",
      description: "Audio description",
    },
  },
  render: (args) => {
    const { audioSource, audioTitle, audioDescription, text, label, language } =
      args;

    return html`
      <cds-aichat-card>
        <div slot="media">
          <cds-aichat-audio-player
            source=${audioSource}
            aria-label=${audioTitle}
            data-rounded="top"
          >
          </cds-aichat-audio-player>
        </div>
        <div slot="body" style="padding: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">${audioTitle}</h4>
          <p style="margin: 0 0 1rem 0; color: var(--cds-text-secondary);">
            ${audioDescription}
          </p>
          <cds-aichat-transcript
            text=${text}
            label=${label}
            language=${language}
          >
          </cds-aichat-transcript>
        </div>
      </cds-aichat-card>
    `;
  },
};

export const MultipleLanguages = {
  render: () => {
    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <cds-aichat-transcript
          text="This is an English transcript."
          label="English Transcript"
          language="en"
        >
        </cds-aichat-transcript>

        <cds-aichat-transcript
          text="Esta es una transcripción en español."
          label="Transcripción en español"
          language="es"
        >
        </cds-aichat-transcript>

        <cds-aichat-transcript
          text="これは日本語の文字起こしです。"
          label="日本語の文字起こし"
          language="ja"
        >
        </cds-aichat-transcript>
      </div>
    `;
  },
};

// Made with Bob
