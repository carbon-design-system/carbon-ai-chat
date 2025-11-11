/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/tile-container";
import "@carbon/web-components/es/components/tile/tile.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/tile/clickable-tile.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { classMap } from "lit-html/directives/class-map.js";
import { html } from "lit";
import { fn } from "storybook/test";

import Link16 from "@carbon/icons/es/link/16.js";
import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";

import styles from "./story-styles.scss?lit";

const tileContent = html`
  <h5 class="heading-01 margin-bottom-04">AI Chat Tile styling wrapper</h5>
  <p class="body-01">
    The Carbon Design System provides a comprehensive library of components,
    tokens, and guidelines. We need to implement the new AI Chat component
    following Carbon's design principles and accessibility standards.
  </p>
`;

const defaultImage =
  "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg";

const maxWidthControl = {
  control: "radio",
  options: ["unset", "sm", "md", "lg"],
  mapping: {
    unset: "unset",
    sm: "291px",
    md: "438px",
    lg: "535px",
  },
  description:
    "Sets the max width of the story container. This is a story-only control and does not affect the component itself.",
};

const footerActionVariants = {
  "primary danger buttons": (args) => html`
    <cds-button @click=${args.onClick} kind="primary">Primary</cds-button>
    <cds-button @click=${args.onClick} kind="danger">Danger</cds-button>
  `,

  "ghost button with icon": (args) => html`
    <cds-button @click=${args.onClick} kind="ghost">
      View carbon docs
      ${iconLoader(Launch16, {
        slot: "icon",
      })}
    </cds-button>
  `,

  "secondary button": (args) => html`
    <cds-button @click=${args.onClick} kind="secondary">
      Secondary ${iconLoader(Launch16, { slot: "icon" })}
    </cds-button>
  `,

  "3 ghost buttons vertical": (args) => html`
    <cds-button @click=${args.onClick} kind="ghost">
      View Carbon Docs 1
      ${iconLoader(Launch16, {
        slot: "icon",
      })}
    </cds-button>
    <cds-button @click=${args.onClick} kind="ghost">
      View Carbon Docs 2
      ${iconLoader(Launch16, {
        slot: "icon",
      })}
    </cds-button>
    <cds-button @click=${args.onClick} kind="ghost">
      View Carbon Docs 3
      ${iconLoader(Launch16, {
        slot: "icon",
      })}
    </cds-button>
  `,

  "primary button": (args) => html`
    <cds-button @click=${args.onClick} kind="primary">Primary</cds-button>
  `,

  "primary button with icon": (args) => html`
    <cds-button @click=${args.onClick} kind="primary">
      Primary ${iconLoader(ArrowRight16, { slot: "icon" })}
    </cds-button>
  `,

  "danger button": (args) => html`
    <cds-button @click=${args.onClick} kind="danger">Danger</cds-button>
  `,

  "ghost button": (args) => html`
    <cds-button @click=${args.onClick} kind="ghost"> Ghost </cds-button>
  `,

  "secondary primary buttons": (args) => html`
    <cds-button @click=${args.onClick} kind="secondary">Secondary</cds-button>
    <cds-button @click=${args.onClick} kind="primary">Primary</cds-button>
  `,
};

export default {
  title: "Components/Tile Container",
  argTypes: {
    maxWidth: maxWidthControl,
    useWrapper: {
      control: "boolean",
      description: "Toggle rendering inside <cds-aichat-tile-container>",
    },
    onClick: { action: "onClick" },
    layered: {
      control: "boolean",
      description:
        "this is a story only control, add `bg-layer` class on tile to make it layered <a target='_blank' href='https://w3.ibm.com/w3publisher/design-for-ai/carbon-for-ai/ai-chat-patterns/patterns#message-anatomy'>more info on layering</a>",
    },
  },
  args: {
    layered: false,
  },
  decorators: [
    (story, { args }) => html`
      <style>
        ${styles}
      </style>
      <div style="max-width: ${args.maxWidth};">
        ${args.useWrapper
          ? html`<cds-aichat-tile-container
              >${story()}</cds-aichat-tile-container
            >`
          : story()}
      </div>
    `,
  ],
};

export const Default = {
  args: { maxWidth: "sm", useWrapper: true },
  render: (args) =>
    html`<cds-tile
      class=${classMap({
        "bg-layer": args.layered,
      })}
      data-rounded
      >${tileContent}</cds-tile
    >`,
};

export const WithActions = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerAction: "primary danger buttons",
    onClick: fn(),
  },
  argTypes: {
    footerAction: {
      control: "select",
      options: Object.keys(footerActionVariants),
      mapping: footerActionVariants,
      description: "Footer button variations",
    },
  },
  render: (args) => {
    const footerAction = args.footerAction(args);
    const buttonCount = (
      footerAction?.strings?.join(" ")?.match(/<cds-button\b/g) || []
    ).length;

    return html`
      <cds-tile
        data-rounded
        data-testid="clickable-tile"
        class=${classMap({
          "bg-layer": args.layered,
        })}
      >
        ${tileContent}
        ${buttonCount !== 0
          ? html`<div
              class=${classMap({
                "cds-aichat--tile-container-footer": true,
                "margin-top-05": true,
              })}
              ?data-stacked=${buttonCount > 2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              ${footerAction}
            </div>`
          : ""}
      </cds-tile>
    `;
  },
};

export const WithImage = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerAction: "primary button",
    onClick: fn(),
  },
  argTypes: {
    footerAction: {
      control: "select",
      options: Object.keys(footerActionVariants),
      mapping: footerActionVariants,
      description: "Footer button variations",
    },
  },
  render: (args) => {
    const footerAction = args.footerAction(args);
    const buttonCount =
      footerAction?.strings?.[0]?.trim().split("\n").length || 0;

    return html`
      <cds-tile
        data-rounded
        class=${classMap({
          "bg-layer": args.layered,
        })}
      >
        <div data-flush="top">
          <img
            data-rounded="top"
            class="margin-bottom-05"
            src=${defaultImage}
            alt="image"
          />
        </div>
        ${tileContent}
        ${buttonCount !== 0
          ? html`<div
              class=${classMap({
                "cds-aichat--tile-container-footer": true,
                "margin-top-05": true,
              })}
              data-stacked=${buttonCount > 2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              ${footerAction}
            </div>`
          : ""}
      </cds-tile>
    `;
  },
};

export const OnlyImage = {
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: (args) => html`
    <cds-tile
      data-rounded
      class=${classMap({
        "bg-layer": args.layered,
      })}
      ><div data-flush><img data-rounded src=${defaultImage} alt="image" /></div
    ></cds-tile>
  `,
};

export const OnlyImageClickable = {
  args: { maxWidth: "sm", disabled: false, useWrapper: true, onClick: fn() },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "disables the clickable tile",
    },
  },
  render: (args) => html`
    <cds-clickable-tile
      class=${classMap({
        "bg-layer": args.layered,
      })}
      data-rounded
      @click=${args.onClick}
      ?disabled=${args.disabled}
    >
      <div data-flush><img data-rounded src=${defaultImage} alt="image" /></div>
    </cds-clickable-tile>
  `,
};

export const WithAudio = {
  name: "With Audio (iframe)",
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: (args) => html`
    <cds-tile
      class=${classMap({
        "bg-layer": args.layered,
      })}
      data-testid="clickable-tile"
      data-rounded
    >
      <div data-flush="top" data-rounded="top" class="margin-bottom-05">
        <iframe
          class="full-width aspect-16-9"
          scrolling="no"
          title="audio example"
          frameborder="no"
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false&callback=true"
        ></iframe>
      </div>
      <h5 class="body-02">An audio clip from SoundCloud</h5>
      <p class="caption-01 text-secondary">
        This description and the title above are optional.
      </p>
    </cds-tile>
  `,
};

export const OnlyVideo = {
  args: { maxWidth: "md", useWrapper: true, onClick: fn() },
  render: (args) => html`
    <cds-tile
      class=${classMap({
        "bg-layer": args.layered,
      })}
      data-rounded
      data-testid="clickable-tile"
    >
      <div data-rounded data-flush>
        <iframe
          class="full-width aspect-16-9"
          src="https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </cds-tile>
  `,
};

export const Clickable = {
  // https://storybook.js.org/docs/writing-tests/interaction-testing
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: (args) => html`
    <cds-clickable-tile
      class=${classMap({
        "bg-layer": args.layered,
      })}
      data-rounded
      @click=${args.onClick}
      data-testid="clickable-tile"
    >
      ${tileContent}
      <br />
      <div
        class="link-secondary"
        style="display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;"
      >
        <span
          style="display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
        >
          Lorem ipsum dolor sit, amet consectetur adipisicing.
        </span>
        ${iconLoader(Link16, { style: "flex: none;" })}
      </div>
    </cds-clickable-tile>
  `,
};
