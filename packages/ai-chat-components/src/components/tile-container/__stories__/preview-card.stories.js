import "../src/tile-container";
import "@carbon/web-components/es/components/tile/tile.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { classMap } from "lit-html/directives/class-map.js";
import { html } from "lit";
import { fn } from "storybook/test";

import Download16 from "@carbon/icons/es/download/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";

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
  "1 ghost button, 2 ghost icon buttons": (args) => html`
    <cds-button
      class="text-primary"
      @click=${args.onClick}
      size="md"
      kind="ghost"
    >
      View details
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
};

export default {
  title: "Components/Tile Container/Preview Card",
  argTypes: {
    maxWidth: maxWidthControl,
    useWrapper: {
      control: "boolean",
      description: "Toggle rendering inside <cds-aichat-tile-container>",
    },
    aiLabel: { control: "boolean" },
    footerActions: {
      control: "select",
      options: Object.keys(footerActionVariants),
      mapping: footerActionVariants,
      description: "Footer button variations",
    },
    layered: {
      control: "boolean",
      description:
        "this is a story only control, add `bg-layer` class on tile to make it layered <a target='_blank' href='https://w3.ibm.com/w3publisher/design-for-ai/carbon-for-ai/ai-chat-patterns/patterns#message-anatomy'>more info on layering</a>",
    },
    onClick: { action: "onClick" },
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

export const Small = {
  name: "Small",
  args: {
    maxWidth: "sm",
    useWrapper: true,
    aiLabel: true,
    footerActions: "1 ghost button, 2 ghost icon buttons",
    onClick: fn(),
  },
  render: (args) => html`
    <cds-tile
      data-rounded
      class=${classMap({
        "bg-layer": args.layered,
      })}
    >
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      ${args.aiLabel
        ? html`<cds-ai-label
            data-testid="ai-label"
            size="mini"
            autoalign
            alignment="bottom-left"
            slot=""
          >
            ${aiContent}
          </cds-ai-label>`
        : ""}
      ${args.footerActions(args)
        ? html`<div
            class=${classMap({
              "cds--aichat-tile-container-footer": true,
              "border-top": true,
              "margin-top-04": true,
            })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${args.footerActions(args)}
          </div>`
        : ""}
    </cds-tile>
  `,
};
