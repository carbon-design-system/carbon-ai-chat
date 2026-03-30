/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { Transcript } from "../../../react/transcript";
import { AudioPlayer } from "../../../react/audio-player";
import { Card } from "../../../react/card";
import "./transcript-react.stories.css";

export default {
  title: "Preview/Audio player/Transcript",
  component: Transcript,
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

    return <Transcript text={text} label={label} language={language} />;
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

    return <Transcript text={text} label={label} language={language} />;
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

    return (
      <Card>
        <div slot="media">
          <AudioPlayer
            source={audioSource}
            ariaLabel={audioTitle}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="audio-player-card-body">
          <h4 className="audio-player-card-title">{audioTitle}</h4>
          <p className="audio-player-card-description">{audioDescription}</p>
          <Transcript text={text} label={label} language={language} />
        </div>
      </Card>
    );
  },
};

export const MultipleLanguages = {
  render: () => {
    return (
      <div className="transcript-examples-container">
        <Transcript
          text="This is an English transcript."
          label="English Transcript"
          language="en"
        />

        <Transcript
          text="Esta es una transcripción en español."
          label="Transcripción en español"
          language="es"
        />

        <Transcript
          text="これは日本語の文字起こしです。"
          label="日本語の文字起こし"
          language="ja"
        />
      </div>
    );
  },
};

export const WithEventHandling = {
  render: function EventHandlingExample(args) {
    const { text, label, language } = args;
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
      <>
        <p>
          Transcript is currently:{" "}
          <strong>{isExpanded ? "Expanded" : "Collapsed"}</strong>
        </p>
        <Transcript
          text={text}
          label={label}
          language={language}
          onCdsAichatTranscriptToggle={(e) => {
            setIsExpanded(e.detail.expanded);
          }}
        />
      </>
    );
  },
};

// Made with Bob
