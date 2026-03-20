/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import VideoPlayer from "../../../react/video-player";
import Card from "../../../react/card";
import "./video-player-react.stories.css";

export default {
  title: "Preview/Video player (React)",
  component: VideoPlayer,
  args: {
    source: "https://www.youtube.com/watch?v=eZ1NizUx9U4",
    title: "Sample Video Title",
    description:
      "This is a sample video description that provides context about the video content.",
    playing: false,
    aspectRatioPercentage: 56.25,
    ariaLabel: "Video player",
    useCard: true,
  },
  argTypes: {
    source: {
      control: "select",
      options: [
        "https://www.youtube.com/watch?v=eZ1NizUx9U4",
        "https://vimeo.com/671038464",
        "Custom URL",
      ],
      mapping: {
        "https://www.youtube.com/watch?v=eZ1NizUx9U4":
          "https://www.youtube.com/watch?v=eZ1NizUx9U4",
        "https://vimeo.com/671038464": "https://vimeo.com/671038464",
        "Custom URL": "",
      },
      description:
        "Video source URL (YouTube, Vimeo, native video files, etc.). Select from dropdown or choose 'Custom URL' to enter your own.",
    },
    title: {
      control: "text",
      description: "Video title displayed in card body (when useCard is true)",
    },
    description: {
      control: "text",
      description:
        "Video description displayed in card body (when useCard is true)",
    },
    playing: {
      control: "boolean",
      description: "Whether the video should be playing",
    },
    aspectRatioPercentage: {
      control: { type: "number", min: 0, max: 100, step: 0.01 },
      description:
        "Aspect ratio as padding-top percentage (default: 56.25 for 16:9)",
    },
    ariaLabel: {
      control: "text",
      description: "ARIA label for accessibility",
    },
    useCard: {
      control: "boolean",
      description: "Wrap video player in a card component with metadata",
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

    const videoPlayer = useCard ? (
      <VideoPlayer
        source={source}
        playing={playing}
        aspectRatioPercentage={aspectRatioPercentage}
        ariaLabel={ariaLabel}
        data-rounded="top"
      />
    ) : (
      <VideoPlayer
        source={source}
        playing={playing}
        aspectRatioPercentage={aspectRatioPercentage}
        ariaLabel={ariaLabel}
      />
    );

    if (!useCard) {
      return videoPlayer;
    }

    return (
      <Card isFlush>
        <div slot="media">{videoPlayer}</div>
        <div slot="body" className="video-player-card-body">
          <h4 className="video-player-card-title">{title}</h4>
          <p className="video-player-card-description">{description}</p>
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
      <VideoPlayer
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
    source: "https://www.youtube.com/watch?v=eZ1NizUx9U4",
    title: "Understanding AI and Machine Learning",
    description:
      "An in-depth exploration of artificial intelligence and machine learning concepts, covering neural networks, deep learning, and practical applications in modern technology.",
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
      <Card isFlush>
        <div slot="media">
          <VideoPlayer
            source={source}
            playing={playing}
            aspectRatioPercentage={aspectRatioPercentage}
            ariaLabel={ariaLabel}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="video-player-card-body">
          <h4 className="video-player-card-title">{title}</h4>
          <p className="video-player-card-description">{description}</p>
        </div>
      </Card>
    );
  },
};

export const ErrorState = {
  args: {
    source: "https://invalid-url-that-will-cause-error.com/video.mp4",
    title: "Error State Example",
    description:
      "This demonstrates the error state when a video fails to load.",
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
      <Card isFlush>
        <div slot="media">
          <VideoPlayer
            source={source}
            playing={playing}
            aspectRatioPercentage={aspectRatioPercentage}
            ariaLabel={ariaLabel}
            data-rounded="top"
          />
        </div>
        <div slot="body" className="video-player-card-body">
          <h4 className="video-player-card-title">{title}</h4>
          <p className="video-player-card-description">{description}</p>
        </div>
      </Card>
    );
  },
};

// Made with Bob
