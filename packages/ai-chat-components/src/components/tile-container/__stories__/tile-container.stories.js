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
import "@carbon/web-components/es/components/tile/clickable-tile.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Link16 from "@carbon/icons/es/link/16.js";
import { html } from "lit";
import { expect, fn } from "storybook/test";
import styles from "./story-styles.scss?lit";

const aiContent = html`<div slot="body-text">
  <p>AI Explained</p>
  <h2>84%</h2>
  <p>Confidence score</p>
  <p>
    Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed do
    eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
  </p>
  <hr />
  <p>Model type</p>
  <a
    href="#"
    @click="${(e) => {
      e.preventDefault();
    }}"
    >Foundation model</a
  >
</div>`;

export default {
  title: "Components/Tile Container",
  argTypes: {
    maxWidth: {
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
    },
    useWrapper: {
      control: "boolean",
      description: "Toggle rendering inside <cds-aichat-tile-container>",
    },
    onClick: { action: "onClick" },
    tileContent: {
      control: "select",
      options: ["text", "image", "image and text"],
      mapping: {
        text: html`
          <h5>AI Chat Tile</h5>
          <p>
            Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
            do eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
          </p>
        `,
        image: html`<img
          class="full-width"
          src="https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg"
          alt="image"
        />`,
        "image and text": html`
          <img
            class="full-width"
            src="https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg"
            alt="image"
          />
          <h5>AI Chat Tile</h5>
          <p>
            Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
            do eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
          </p>
        `,
      },
      description: "Toggle rendering of the tile content",
    },
    footerButtons: {
      control: "select",
      options: [
        "primary button",
        "secondary button",
        "ghost button",
        "danger button",
        "primary, danger buttons",
        "secondary, primary buttons",
        "3 ghost buttons (vertical)",
        "none",
      ],
      mapping: {
        "primary button": html`<cds-button kind="primary">Primary</cds-button>`,
        "secondary button": html`<cds-button kind="secondary"
          >Secondary</cds-button
        >`,
        "ghost button": html`<cds-button kind="ghost">Ghost</cds-button>`,
        "danger button": html`<cds-button kind="danger">Danger</cds-button>`,
        "primary, danger buttons": html`
          <cds-button kind="primary">Primary</cds-button>
          <cds-button kind="danger">Danger</cds-button>
        `,
        "secondary, primary buttons": html`
          <cds-button kind="secondary">Secondary</cds-button>
          <cds-button kind="primary">Primary</cds-button>
        `,
        "3 ghost buttons (vertical)": html`
          <cds-button kind="ghost">Ghost 1</cds-button>
          <cds-button kind="ghost">Ghost 2</cds-button>
          <cds-button kind="ghost">Ghost 3</cds-button>
        `,
        none: "",
      },
      description: "Footer button variations",
    },

    footerOrientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Orientation of the footer buttons defaults to horizontal",
    },
  },
  decorators: [
    (story, { args }) =>
      html` <style>
          ${styles}
        </style>
        <div style="max-width: ${args.maxWidth};">
          ${args.useWrapper
            ? html` <cds-aichat-tile-container
                >${story()}</cds-aichat-tile-container
              >`
            : story()}
        </div>`,
  ],
};

export const Default = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    tileContent: "text",
    footerButtons: "primary button",
    footerOrientation: "horizontal",
  },
  render: (args) => {
    const buttonCount =
      (args.footerButtons.strings &&
        args.footerButtons.strings[0].trim().split("\n").length) ||
      0;
    if (buttonCount >= 3) {
      args.footerOrientation = "vertical";
    }

    let footerClass = `cds-aichat-tile-container-footer ${args.footerOrientation}`;

    return html`
      <cds-tile>
        ${args.tileContent}
        <div class="${footerClass}">${args.footerButtons}</div>
      </cds-tile>
    `;
  },
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
  args: {
    maxWidth: "sm",
    useWrapper: true,
    tileContent: "text",
    onClick: fn(),
  },
  argTypes: {
    footerButtons: {
      control: false,
      description: "Footer buttons are not applicable for clickable tiles",
    },
    footerOrientation: {
      control: false,
      description: "Footer orientation is not applicable for clickable tiles",
    },
  },
  render: (args) => {
    let footerClass = `cds-aichat-tile-container-footer ${args.footerOrientation}`;

    return html`
      <cds-clickable-tile @click=${args.onClick} data-testid="clickable-tile">
        ${args.tileContent}
        <div class="${footerClass}">${args.footerButtons}</div>
      </cds-clickable-tile>
    `;
  },
};

export const ClickableWithCustomIcon = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    tileContent: "text",
  },
  argTypes: {
    footerButtons: {
      control: false,
      description: "Footer buttons are not applicable for clickable tiles",
    },
    footerOrientation: {
      control: false,
      description: "Footer orientation is not applicable for clickable tiles",
    },
  },
  render: (args) => {
    let footerClass = `cds-aichat-tile-container-footer ${args.footerOrientation}`;

    return html`
      <cds-clickable-tile @click=${args.onClick}>
        ${args.tileContent} ${iconLoader(Link16, { slot: "icon" })}
        <div class="${footerClass}">${args.footerButtons}</div>
      </cds-clickable-tile>
    `;
  },
};

export const WithAiLabel = {
  // https://storybook.js.org/docs/writing-tests/interaction-testing
  play: async ({ canvas, userEvent, mount }) => {
    await mount();
    const tile = canvas.getByTestId("tile");
    const aiLabel = tile.querySelector("cds-ai-label");
    const aiLabelTriggerButton =
      aiLabel.shadowRoot.querySelector(".cds--slug__button");

    expect(aiLabel.open).toBe(false);
    await userEvent.click(aiLabelTriggerButton);
    expect(aiLabel.open).toBe(true);
    await userEvent.click(document.body);
    expect(aiLabel.open).toBe(false);
  },
  args: {
    maxWidth: "sm",
    useWrapper: true,
    tileContent: "text",
    footerButtons: "primary button",
    footerOrientation: "horizontal",
  },
  argTypes: {
    tileContent: {
      control: false,
      description: "default tile content is text for AI label stories",
    },
  },
  render: (args) => {
    const buttonCount =
      (args.footerButtons.strings &&
        args.footerButtons.strings[0].trim().split("\n").length) ||
      0;
    if (buttonCount >= 3) {
      args.footerOrientation = "vertical";
    }
    let footerClass = `cds-aichat-tile-container-footer ${args.footerOrientation}`;

    return html`
      <cds-tile data-testid="tile">
        ${args.tileContent}
        <cds-ai-label
          data-testid="ai-label"
          autoalign
          alignment="bottom-left"
          slot="ai-label"
        >
          ${aiContent}
        </cds-ai-label>
        <div class="${footerClass}">${args.footerButtons}</div>
      </cds-tile>
    `;
  },
};

export const ClickableWithAiLabel = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    tileContent: "text",
  },
  argTypes: {
    tileContent: {
      control: false,
      description: "default tile content is text for AI label stories",
    },
    footerButtons: {
      control: false,
      description: "Footer buttons are not applicable for clickable tiles",
    },
    footerOrientation: {
      control: false,
      description: "Footer orientation is not applicable for clickable tiles",
    },
  },
  render: (args) => {
    let footerClass = `cds-aichat-tile-container-footer ${args.footerOrientation}`;

    return html`
      <cds-clickable-tile @click=${args.onClick} ai-label>
        ${args.tileContent}
        <div class="${footerClass}">${args.footerButtons}</div>
      </cds-clickable-tile>
    `;
  },
};
