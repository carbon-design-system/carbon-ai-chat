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
import { expect, fn } from "storybook/test";

import Link16 from "@carbon/icons/es/link/16.js";
import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";

import styles from "./story-styles.scss?lit";

const aiContent = html`
  <div slot="body-text">
    <p>AI Explained</p>
    <h2>84%</h2>
    <p>Confidence score</p>
    <p>
      Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed do
      eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
    </p>
    <hr />
    <p>Model type</p>
    <a href="#">Foundation model</a>
  </div>
`;

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
    <cds-button @click=${args.onClick} class="top-border" kind="ghost">
      View carbon docs
      ${iconLoader(Launch16, {
        slot: "icon",
        style: "fill: var(--cds-link-primary)",
      })}
    </cds-button>
  `,

  "secondary button": (args) => html`
    <cds-button @click=${args.onClick} kind="secondary">
      Secondary ${iconLoader(Launch16, { slot: "icon" })}
    </cds-button>
  `,

  "3 ghost buttons vertical": (args) => html`
    <cds-button @click=${args.onClick} class="top-border" kind="ghost">
      View Carbon Docs 1
      ${iconLoader(Launch16, {
        slot: "icon",
        style: "fill: var(--cds-link-primary)",
      })}
    </cds-button>
    <cds-button @click=${args.onClick} class="top-border" kind="ghost">
      View Carbon Docs 2
      ${iconLoader(Launch16, {
        slot: "icon",
        style: "fill: var(--cds-link-primary)",
      })}
    </cds-button>
    <cds-button @click=${args.onClick} class="top-border" kind="ghost">
      View Carbon Docs 3
      ${iconLoader(Launch16, {
        slot: "icon",
        style: "fill: var(--cds-link-primary)",
      })}
    </cds-button>
  `,

  "primary button": (args) => html`
    <cds-button @click=${args.onClick} kind="primary">Primary</cds-button>
  `,

  "danger button": (args) => html`
    <cds-button @click=${args.onClick} kind="danger">Danger</cds-button>
  `,

  "ghost button": (args) => html`
    <cds-button @click=${args.onClick} class="top-border" kind="ghost">
      Ghost
    </cds-button>
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
  render: () => html`<cds-tile>${tileContent}</cds-tile>`,
};

export const WithActions = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerActions: "primary danger buttons",
    onClick: fn(),
  },
  argTypes: {
    footerActions: {
      control: "select",
      options: Object.keys(footerActionVariants),
      mapping: footerActionVariants,
      description: "Footer button variations",
    },
  },
  render: (args) => {
    const content = args.footerActions(args);
    const buttonCount = (
      content?.strings?.join(" ")?.match(/<cds-button\b/g) || []
    ).length;

    return html`
      <cds-tile data-testid="clickable-tile">
        ${tileContent}
        <div
          ?stacked=${buttonCount > 2}
          class=${classMap({ "cds--aichat-tile-container-footer": true })}
          flush
        >
          ${content}
        </div>
      </cds-tile>
    `;
  },
};

export const WithImage = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerActions: "primary button",
    onClick: fn(),
  },
  argTypes: {
    footerActions: {
      control: "select",
      options: ["primary button", "ghost button", "none"],
      mapping: {
        "primary button": (args) => html`
          <cds-button @click=${args.onClick} kind="primary">
            Select ${iconLoader(ArrowRight16, { slot: "icon" })}
          </cds-button>
        `,
        "ghost button": (args) => html`
          <cds-button @click=${args.onClick} class="top-border" kind="ghost">
            Select
            ${iconLoader(ArrowRight16, {
              slot: "icon",
              style: "fill: var(--cds-link-primary)",
            })}
          </cds-button>
        `,
        none: () => "",
      },
      description: "Footer button variations",
    },
  },
  render: (args) => {
    const content = args.footerActions(args);
    const buttonCount = content?.strings?.[0]?.trim().split("\n").length || 0;

    return html`
      <cds-tile>
        <img class="full-width" src=${defaultImage} alt="image" />
        ${tileContent}
        <div
          class=${classMap({
            "cds--aichat-tile-container-footer": true,
            vertical: buttonCount > 2,
          })}
          flush
        >
          ${content}
        </div>
      </cds-tile>
    `;
  },
};

export const OnlyImage = {
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: () => html`
    <cds-tile
      ><img class="full-width" src=${defaultImage} alt="image"
    /></cds-tile>
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
    <cds-clickable-tile @click=${args.onClick} ?disabled=${args.disabled}>
      <img class="full-width" src=${defaultImage} alt="image" />
    </cds-clickable-tile>
  `,
};

export const WithAudio = {
  name: "With Audio (iframe)",
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: () => html`
    <cds-tile data-testid="clickable-tile">
      <iframe
        class="full-width aspect-16-9"
        scrolling="no"
        title="audio example"
        frameborder="no"
        allow="autoplay"
        src="https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false&callback=true"
      ></iframe>
      <h5 class="body-02">An audio clip from SoundCloud</h5>
      <p class="caption-01 text-secondary">
        This description and the title above are optional.
      </p>
    </cds-tile>
  `,
};

export const OnlyVideo = {
  args: { maxWidth: "md", useWrapper: true, onClick: fn() },
  render: () => html`
    <cds-tile data-testid="clickable-tile">
      <iframe
        class="full-width aspect-16-9"
        src="https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </cds-tile>
  `,
};

export const Clickable = {
  // https://storybook.js.org/docs/writing-tests/interaction-testing
  play: async ({ canvas, userEvent, args }) => {
    const tile = canvas.getByTestId("clickable-tile");
    const tileTrigger = tile.shadowRoot.querySelector(".cds--tile--clickable");
    await userEvent.click(tileTrigger);
    expect(args.onClick).toHaveBeenCalled();
    await userEvent.click(document.body);
    expect(tile).not.toHaveFocus();
  },
  args: { maxWidth: "sm", useWrapper: true, onClick: fn() },
  render: (args) => html`
    <cds-clickable-tile @click=${args.onClick} data-testid="clickable-tile">
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

export const AssetCard = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    aiLabel: true,
    footerActions: "1 ghost button, 2 ghost icon buttons",
  },
  argTypes: {
    aiLabel: { control: "boolean" },
    footerActions: {
      control: "select",
      options: ["1 ghost button, 2 ghost icon buttons", "none"],
      mapping: {
        "1 ghost button, 2 ghost icon buttons": (args) => html`
          <cds-button
            class="text-primary"
            @click=${args.onClick}
            size="md"
            kind="ghost"
            disabled
          >
            Viewing
          </cds-button>
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Download16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Maximize16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
        `,
        none: () => "",
      },
      description: "Footer button variations",
    },
  },
  render: (args) => html`
    <!-- this bg-transparent class may not go well when placed in widget which has background gradient. in such case remove this class and use the same layer token manually -->
    <cds-tile class="bg-transparent">
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      ${args.aiLabel
        ? html`<cds-ai-label
            data-testid="ai-label"
            autoalign
            alignment="bottom-left"
            slot="ai-label"
          >
            ${aiContent}
          </cds-ai-label>`
        : ""}
      ${args.footerActions(args)
        ? html`<div
            class=${classMap({
              "cds--aichat-tile-container-footer": true,
              "top-border": true,
            })}
            flush
          >
            ${args.footerActions(args)}
          </div>`
        : ""}
    </cds-tile>
  `,
};
