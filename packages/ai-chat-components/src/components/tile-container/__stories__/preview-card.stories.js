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

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { classMap } from "lit-html/directives/class-map.js";
import { html } from "lit";
import { fn } from "storybook/test";

import Download16 from "@carbon/icons/es/download/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Version16 from "@carbon/icons/es/version/16.js";

import styles from "./story-styles.scss?lit";

const aiContent = html`
  <div slot="body-text">
    <h4 class="margin-bottom-05">Powered by IBM watsonx</h4>
    <div>
      IBM watsonx is powered by the latest AI models to intelligently process
      conversations and provide help whenever and wherever you may need it.
    </div>
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
  "2 ghost icon buttons": (args) => html`
    <div data-rounded="bottom-right" class="display-flex">
      <cds-icon-button @click=${args.onClick} kind="ghost">
        ${iconLoader(Download16, { slot: "icon" })}
        <span slot="tooltip-content">Icon Description</span>
      </cds-icon-button>
      <cds-icon-button @click=${args.onClick} kind="ghost">
        ${iconLoader(Maximize16, { slot: "icon" })}
        <span slot="tooltip-content">Icon Description</span>
      </cds-icon-button>
    </div>
  `,
  "1 ghost button with icon": (args) => html`
    <cds-button
      class="text-primary"
      @click=${args.onClick}
      size="md"
      kind="ghost"
    >
      View details
      ${iconLoader(Maximize16, {
        slot: "icon",
      })}
    </cds-button>
  `,
  "1 ghost button with viewing state": (args) => html`
    <cds-button
      class="text-primary"
      @click=${args.onClick}
      size="md"
      kind="ghost"
      disabled
      data-viewing
    >
      ${iconLoader(View16)} Viewing
    </cds-button>
  `,
  none: () => "",
};
const stepVariation = {
  "with label": () => html`
    <div
      class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
    >
      <p class="body-compact-01 text-primary no-wrap">Step 1</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
    <div
      class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
    >
      <p class="body-compact-01 text-primary no-wrap">Step 2</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
    <div class="display-flex padding-inline gap-05 padding-block-04">
      <p class="body-compact-01 text-primary no-wrap">Step 2</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
  `,
  "title only": () =>
    html` <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 1</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>
      <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>
      <div class="display-flex padding-inline gap-05 padding-block-04">
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>`,
  "wrapping content": () =>
    html` <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 1</p>
        <div>
          <p class="body-compact-01 text-secondary">Lorem, ipsum.</p>
        </div>
      </div>
      <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">
            Lorem ipsum dolor sit, amet consectetur adipisicing elit.
          </p>
        </div>
      </div>
      <div class="display-flex padding-inline gap-05 padding-block-04">
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quod
            dignissimos distinctio minus placeat dicta dolores, rerum
            perspiciatis officia laudantium. Quasi!
          </p>
        </div>
      </div>`,
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
    footerAction: {
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
  argTypes: {
    maxWidth: { table: { disable: true } },
  },
  args: {
    maxWidth: "sm",
    useWrapper: true,
    aiLabel: true,
    footerAction: "2 ghost icon buttons",
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
      ${args.footerAction(args)
        ? html`<div
            class=${classMap({
              "cds-aichat--tile-container-footer": true,
              "margin-top-05": true,
            })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${args.footerAction(args)}
          </div>`
        : ""}
    </cds-tile>
  `,
};

export const Default = {
  argTypes: {
    maxWidth: { table: { disable: true } },
    footerAction: { table: { disable: true } },
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    aiLabel: true,
    footerAction: "1 ghost button with icon",
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
      <p class="helper-text-01 text-secondary margin-bottom-03">Subtitle</p>
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

      <div
        data-flush
        class="border-top margin-bottom-04 margin-top-04 padding-inline"
      >
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
      ${args.footerAction(args)
        ? html`<div
            class=${classMap({
              "cds-aichat--tile-container-footer": true,
              "margin-top-05": true,
            })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${args.footerAction(args)}
          </div>`
        : ""}
    </cds-tile>
  `,
};

export const DefaultWithToolbar = {
  argTypes: {
    maxWidth: { table: { disable: true } },
    footerAction: { table: { disable: true } },
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    aiLabel: true,
    onClick: fn(),
  },
  render: (args) => html`
    <cds-tile
      data-rounded
      class=${classMap({
        "bg-layer": args.layered,
      })}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5 class="flex-1 body-compact-02 padding-inline align-content-center">
          Resource comsumption
        </h5>
        <div data-rounded="top-right" class="display-flex">
          ${args.aiLabel
            ? html`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                ${aiContent}
              </cds-ai-label>`
            : ""}
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Version16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Download16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Share16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${args.onClick} kind="ghost">
            ${iconLoader(Maximize16, { slot: "icon" })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
        </div>
      </div>
      <div data-flush class="border-top margin-top-05 padding-inline">
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
    </cds-tile>
  `,
};

export const WithSteps = {
  argTypes: {
    maxWidth: { table: { disable: true } },
    footerAction: { table: { disable: true } },
    stepVariation: {
      control: "select",
      options: Object.keys(stepVariation),
      mapping: stepVariation,
      description: "step variations",
    },
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    stepVariation: "with label",
    footerAction: "1 ghost button with icon",
    aiLabel: true,
    onClick: fn(),
  },
  render: (args) => html`
    <cds-tile
      data-rounded
      class=${classMap({
        "bg-layer": args.layered,
      })}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5
          class="flex-1 body-compact-02 padding-inline align-content-center block-size-08"
        >
          Plan Title
        </h5>
        <div data-rounded="top-right" class="display-flex">
          ${args.aiLabel
            ? html`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                ${aiContent}
              </cds-ai-label>`
            : ""}
        </div>
      </div>
      <div data-flush class="border-top margin-top-05">
        ${args.stepVariation(args)}
      </div>
      ${args.footerAction(args)
        ? html`<div
            class=${classMap({
              "cds-aichat--tile-container-footer": true,
              "margin-top-05": true,
            })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${args.footerAction(args)}
          </div>`
        : ""}
    </cds-tile>
  `,
};
