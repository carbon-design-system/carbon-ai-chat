/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../index";
import "../../card/index.js";
import { html } from "lit";

export default {
  title: "Preview/Video player",
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

    const videoPlayer = useCard
      ? html`
          <cds-aichat-video-player
            source=${source}
            ?playing=${playing}
            aspect-ratio-percentage=${aspectRatioPercentage}
            aria-label=${ariaLabel}
            data-rounded="top"
          >
          </cds-aichat-video-player>
        `
      : html`
          <cds-aichat-video-player
            source=${source}
            ?playing=${playing}
            aspect-ratio-percentage=${aspectRatioPercentage}
            aria-label=${ariaLabel}
          >
          </cds-aichat-video-player>
        `;

    if (!useCard) {
      return videoPlayer;
    }

    return html`
      <cds-aichat-card is-flush>
        <div slot="media">${videoPlayer}</div>
        <div slot="body" style="padding: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">${title}</h4>
          <p style="margin: 0; color: var(--cds-text-secondary);">
            ${description}
          </p>
        </div>
      </cds-aichat-card>
    `;
  },
};

export const Standalone = {
  args: {
    useCard: false,
  },
  render: (args) => {
    const { source, playing, aspectRatioPercentage, ariaLabel } = args;

    return html`
      <cds-aichat-video-player
        source=${source}
        ?playing=${playing}
        aspect-ratio-percentage=${aspectRatioPercentage}
        aria-label=${ariaLabel}
      >
      </cds-aichat-video-player>
    `;
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

    return html`
      <cds-aichat-card is-flush>
        <div slot="media">
          <cds-aichat-video-player
            source=${source}
            ?playing=${playing}
            aspect-ratio-percentage=${aspectRatioPercentage}
            aria-label=${ariaLabel}
            data-rounded="top"
          >
          </cds-aichat-video-player>
        </div>
        <div slot="body" style="padding: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">${title}</h4>
          <p style="margin: 0; color: var(--cds-text-secondary);">
            ${description}
          </p>
        </div>
      </cds-aichat-card>
    `;
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

    return html`
      <cds-aichat-card is-flush>
        <div slot="media">
          <cds-aichat-video-player
            source=${source}
            ?playing=${playing}
            aspect-ratio-percentage=${aspectRatioPercentage}
            aria-label=${ariaLabel}
            data-rounded="top"
          >
          </cds-aichat-video-player>
        </div>
        <div slot="body" style="padding: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">${title}</h4>
          <p style="margin: 0; color: var(--cds-text-secondary);">
            ${description}
          </p>
        </div>
      </cds-aichat-card>
    `;
  },
};

// Made with Bob
