/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import AudioPlayer from "../../../react/audio-player";
import { Transcript } from "../../../react/transcript";
import Card from "../../../react/card";
import "./audio-player-react.stories.css";

export default {
  title: "Preview/Audio player",
  component: AudioPlayer,
  args: {
    source:
      "https://soundcloud.com/ibmthinkleaders/leveraging-ai-to-tackle-large-problems-being-an-optimistic-futurist-feat-kate-oneill",
    title: "Leveraging AI to Tackle Large Problems",
    description:
      "A conversation about being an optimistic futurist featuring Kate O'Neill from IBM Think Leaders.",
    playing: false,
    aspectRatioPercentage: 56.25,
    ariaLabel: "Audio player",
    useCard: true,
  },
  argTypes: {
    source: {
      control: "text",
      description: "Audio source URL (SoundCloud, native audio files, etc.)",
    },
    title: {
      control: "text",
      description: "Audio title displayed in card body (when useCard is true)",
    },
    description: {
      control: "text",
      description:
        "Audio description displayed in card body (when useCard is true)",
    },
    playing: {
      control: "boolean",
      description: "Whether the audio should be playing",
    },
    aspectRatioPercentage: {
      control: { type: "number", min: 0, max: 100, step: 0.01 },
      description:
        "Aspect ratio as padding-top percentage (default: 56.25 for visual consistency)",
    },
    ariaLabel: {
      control: "text",
      description: "ARIA label for accessibility",
    },
    useCard: {
      control: "boolean",
      description: "Wrap audio player in a card component with metadata",
    },
  },
};

export const Default = {
  render: (args) => {
    const {
      source,
      title,
      description,
      playing,
      aspectRatioPercentage,
      ariaLabel,
      useCard,
    } = args;

    const audioPlayer = useCard ? (
      <AudioPlayer
        source={source}
        playing={playing}
        aspectRatioPercentage={aspectRatioPercentage}
        ariaLabel={ariaLabel}
        data-rounded="top"
      />
    ) : (
      <AudioPlayer
        source={source}
        playing={playing}
        aspectRatioPercentage={aspectRatioPercentage}
        ariaLabel={ariaLabel}
      />
    );

    if (!useCard) {
      return audioPlayer;
    }

    return (
      <Card>
        <div slot="media">{audioPlayer}</div>
        <div slot="body" className="audio-player-card-body">
          <h4 className="audio-player-card-title">{title}</h4>
          <p className="audio-player-card-description">{description}</p>
        </div>
      </Card>
    );
  },
};

export const Standalone = {
  args: {
    useCard: false,
  },
  render: (args) => {
    const { source, playing, aspectRatioPercentage, ariaLabel } = args;

    return (
      <AudioPlayer
        source={source}
        playing={playing}
        aspectRatioPercentage={aspectRatioPercentage}
        ariaLabel={ariaLabel}
      />
    );
  },
};

export const WithMetadata = {
  args: {
    source:
      "https://soundcloud.com/ibmthinkleaders/leveraging-ai-to-tackle-large-problems-being-an-optimistic-futurist-feat-kate-oneill",
    title: "Leveraging AI to Tackle Large Problems",
    description:
      "Join us for an insightful conversation about being an optimistic futurist featuring Kate O'Neill from IBM Think Leaders. Explore how AI can be leveraged to solve complex challenges facing our world today.",
    useCard: true,
  },
  render: (args) => {
    const {
      source,
      title,
      description,
      playing,
      aspectRatioPercentage,
      ariaLabel,
    } = args;

    return (
      <Card>
        <div slot="media">
          <AudioPlayer
            source={source}
            playing={playing}
            aspectRatioPercentage={aspectRatioPercentage}
            ariaLabel={ariaLabel}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="audio-player-card-body">
          <h4 className="audio-player-card-title">{title}</h4>
          <p className="audio-player-card-description">{description}</p>
        </div>
      </Card>
    );
  },
};

export const WithTranscript = {
  args: {
    source:
      "https://web-chat.assistant.test.watson.cloud.ibm.com/assets/Teapot_Hasselhoff.mp3",
    title: "Your own mp3 file with transcript",
    description: "This example includes a transcript for accessibility.",
    transcriptText:
      "My text input is, you know, I am a teapot and then my image input is a picture of David Hasselhoff.",
    transcriptLabel: "English Transcript",
    transcriptLanguage: "en",
    useCard: true,
  },
  argTypes: {
    transcriptText: {
      control: "text",
      description: "Transcript text content",
    },
    transcriptLabel: {
      control: "text",
      description: "Transcript label",
    },
    transcriptLanguage: {
      control: "text",
      description: "Transcript language code",
    },
  },
  render: (args) => {
    const {
      source,
      title,
      description,
      transcriptText,
      transcriptLabel,
      transcriptLanguage,
      playing,
      aspectRatioPercentage,
      ariaLabel,
    } = args;

    return (
      <Card>
        <div slot="media">
          <AudioPlayer
            source={source}
            playing={playing}
            aspectRatioPercentage={aspectRatioPercentage}
            ariaLabel={ariaLabel}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="audio-player-card-body">
          <h4 className="audio-player-card-title">{title}</h4>
          <p className="audio-player-card-description-with-transcript">
            {description}
          </p>
          <Transcript
            text={transcriptText}
            label={transcriptLabel}
            language={transcriptLanguage}
          />
        </div>
      </Card>
    );
  },
};

export const ErrorState = {
  args: {
    source: "https://invalid-url-that-will-cause-error.com/audio.mp3",
    title: "Error State Example",
    description:
      "This demonstrates the error state when an audio file fails to load.",
    useCard: true,
  },
  render: (args) => {
    const {
      source,
      title,
      description,
      playing,
      aspectRatioPercentage,
      ariaLabel,
    } = args;

    return (
      <Card>
        <div slot="media">
          <AudioPlayer
            source={source}
            playing={playing}
            aspectRatioPercentage={aspectRatioPercentage}
            ariaLabel={ariaLabel}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="audio-player-card-body">
          <h4 className="audio-player-card-title">{title}</h4>
          <p className="audio-player-card-description">{description}</p>
        </div>
      </Card>
    );
  },
};

// Made with Bob
