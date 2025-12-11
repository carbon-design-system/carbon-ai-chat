/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// https://storybook.js.org/docs/essentials/controls#conditional-controls

import "../src/card";
import "../src/card-footer";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import styles from "./story-styles.scss?lit";
import { action } from "storybook/actions";
import { cardFooterPresets, previewCardFooterPresets } from "./story-data";

const cardContent = html`
  <div slot="body" class="standard-card">
    <h4>AI Chat Card</h4>
    <p>
      The Carbon Design System provides a comprehensive library of components,
      tokens, and guidelines. We need to implement the new AI Chat component
      following Carbon's design principles and accessibility standards.
    </p>
  </div>
`;

const maxWidthWrapper = (width, storyFn) => {
  return width === "unset"
    ? storyFn()
    : html`<div style="max-width: ${width}">${storyFn()}</div>`;
};

export default {
  title: "Components/Card",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

export const Default = {
  argTypes: {
    isLayered: {
      control: "boolean",
      description:
        "If not set, the card uses `--cds-chat-shell-background`. If set, the card will use `--cds-layer` as its background.",
    },
    isFlush: {
      control: { type: "boolean", disable: true },
      description:
        "Default is `true`. which removes the padding of the card. this is useful when the elements inside the card are already padded. Set to `false` to add padding.",
    },
    maxWidth: {
      control: "radio",
      options: ["unset", "sm", "md", "lg"],
      mapping: { unset: "unset", sm: "291px", md: "438px", lg: "535px" },
      description:
        "Sets the max width of the story container. This only affects the story wrapper and does not affect the component itself.",
    },
  },
  args: { isLayered: false, maxWidth: "sm", isFlush: true },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          ${cardContent}
        </cds-aichat-card>
      `,
    ),
};

export const WithActions = {
  argTypes: {
    ...Default.argTypes,
    footerActions: {
      control: "select",
      options: Object.keys(cardFooterPresets),
      description:
        "Select the preset actions object to display buttons in the card footer.",
    },
    footerSize: {
      control: "select",
      options: ["md", "lg"],
      description: "Set the size of the footer actions container.",
    },
  },
  args: {
    ...Default.args,
    footerActions: "primary danger buttons",
    footerSize: "lg",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          ${cardContent}
          <cds-aichat-card-footer
            .actions=${cardFooterPresets[args.footerActions]}
            size=${ifDefined(args.footerSize)}
            @cds-aichat-card-footer-action=${(e) => action("action")(e.detail)}
          ></cds-aichat-card-footer>
        </cds-aichat-card>
      `,
    ),
};

export const WithImage = {
  argTypes: {
    ...WithActions.argTypes,
    image: {
      control: "text",
      description: "URL of the image tag passed in the card media slot.",
    },
  },
  args: {
    ...WithActions.args,
    image: "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="media" data-rounded="top">
            <img src=${args.image} alt="Card image" />
          </div>
          ${cardContent}
          <cds-aichat-card-footer
            .actions=${cardFooterPresets[args.footerActions]}
            size=${ifDefined(args.footerSize)}
            @cds-aichat-card-footer-action=${(e) => action("action")(e.detail)}
          ></cds-aichat-card-footer>
        </cds-aichat-card>
      `,
    ),
};

export const OnlyImage = {
  argTypes: {
    ...Default.argTypes,
    image: {
      control: "text",
      description: WithImage?.argTypes?.image?.description,
    },
  },
  args: {
    ...Default.args,
    image: "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="media" data-rounded>
            <img src=${args.image} alt="Card image" />
          </div>
        </cds-aichat-card>
      `,
    ),
};

export const WithAudio = {
  argTypes: {
    ...Default.argTypes,
    audio: {
      control: "text",
      description: "URL of the audio iframe to embed in the card media slot.",
    },
  },
  args: {
    ...Default.args,
    audio:
      "https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false&callback=true",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="media" data-rounded="top">
            <iframe
              scrolling="no"
              title="audio example"
              frameborder="no"
              allow="autoplay"
              src=${args.audio}
            ></iframe>
          </div>
          <div slot="body" class="iframe-body">
            <h4>An audio clip from SoundCloud</h4>
            <p>This description and the title above are optional.</p>
          </div>
        </cds-aichat-card>
      `,
    ),
};

export const OnlyVideo = {
  argTypes: {
    ...Default.argTypes,
    video: {
      control: "text",
      description: "URL of the video iframe to embed in the card media slot.",
    },
  },
  args: {
    ...Default.args,
    maxWidth: "md",
    video: "https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="media" data-rounded>
            <iframe
              src=${args.video}
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen=""
            ></iframe>
          </div>
        </cds-aichat-card>
      `,
    ),
};

export const CardFooter = {
  argTypes: {
    ...(() => {
      const {
        isLayered: _isLayered,
        isFlush: _isFlush,
        ...rest
      } = WithActions.argTypes;
      return rest;
    })(),
    footerActions: {
      control: "select",
      options: Object.keys({
        ...cardFooterPresets,
        ...previewCardFooterPresets,
      }),
      description:
        "Select the preset actions array of objects passed to the component to display buttons in the card footer.",
    },
    footerSize: {
      control: "select",
      options: ["md", "lg"],
      description: "Set the size of the footer actions container.",
    },
    "--cds-aichat-rounded-modifier-radius": {
      control: "boolean",
      description:
        "Setting this property with 8px will apply the border radius to the card footer component.",
    },
    "@cds-aichat-card-footer-action": {
      action: "action",
      table: { category: "events" },
      description:
        "Event fired when an action is clicked in the card footer. The event detail contains the action object. including additional payload.",
    },
  },
  args: {
    ...(() => {
      const {
        isLayered: _isLayered,
        isFlush: _isFlush,
        ...rest
      } = WithActions.args;
      return rest;
    })(),
    footerActions: "primary danger buttons",
    footerSize: "lg",
    "--cds-aichat-rounded-modifier-radius": false,
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card-footer
          style=${args["--cds-aichat-rounded-modifier-radius"]
            ? "--cds-aichat-rounded-modifier-radius: 8px;"
            : ""}
          .actions=${{ ...cardFooterPresets, ...previewCardFooterPresets }[
            args.footerActions
          ]}
          size=${ifDefined(args.footerSize)}
          @cds-aichat-card-footer-action=${(e) => action("action")(e.detail)}
        ></cds-aichat-card-footer>
      `,
    ),
};
