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
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/tile/clickable-tile.js";
import { html } from "lit";
import styles from "./story-styles.scss?lit";

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
    clickable: {
      control: "boolean",
    },
    footerVariation: {
      control: "select",
      options: [
        "primary button",
        "secondary button",
        "ghost button",
        "danger button",
        "primary, danger buttons",
        "secondary, primary buttons",
        "ghost buttons (vertical)",
        "none",
      ],
      description: "Footer button variations",
    },
  },
  decorators: [
    (story, context) =>
      html`<div style="max-width: ${context.args.maxWidth};">${story()}</div>`,
  ],
};

export const Default = {
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerVariation: "primary button",
  },
  render: (args) => {
    let buttons = [];
    let footerClass = "cds-aichat-tile-container-footer";

    switch (args.footerVariation) {
      case "primary button":
        buttons = [html`<cds-button kind="primary">Primary</cds-button>`];
        break;
      case "secondary button":
        buttons = [html`<cds-button kind="secondary">Secondary</cds-button>`];
        break;
      case "ghost button":
        buttons = [html`<cds-button kind="ghost">Ghost</cds-button>`];
        break;
      case "danger button":
        buttons = [html`<cds-button kind="danger">Danger</cds-button>`];
        break;
      case "primary, danger buttons":
        buttons = [
          html`<cds-button kind="primary">Primary</cds-button>`,
          html`<cds-button kind="danger">Danger</cds-button>`,
        ];
        break;
      case "secondary, primary buttons":
        buttons = [
          html`<cds-button kind="secondary">Secondary</cds-button>`,
          html`<cds-button kind="primary">Primary</cds-button>`,
        ];
        break;
      case "ghost buttons (vertical)":
        buttons = [
          html`<cds-button kind="ghost">Ghost</cds-button>`,
          html`<cds-button kind="ghost">Ghost</cds-button>`,
          html`<cds-button kind="ghost">Ghost</cds-button>`,
        ];
        footerClass = "cds-aichat-tile-container-footer vertical";
        break;
      case "none":
        buttons = [];
        break;
      default:
        buttons = [];
    }

    const heading = args.useWrapper
      ? args.clickable
        ? "AI Chat Clickable Tile"
        : "AI Chat Tile"
      : args.clickable
        ? "Clickable Tile"
        : "Tile";

    const tileContent = args.useWrapper
      ? html` <h5>${heading}</h5>
          <p>
            Carbon Tiles and Buttons wrapped in a custom AI Chat Tile Container.
            will add all the necessary borders and spacing. and button layout
            styles following AI Chat design.
          </p>`
      : html`
          <h5>${heading}</h5>
          <p>
            Carbon Tiles and Buttons placed without the Tile Container. no AI
            Chat specific styles are applied. lorem ipsum dolor sit amet,
            consectetur adipiscing elit.
          </p>
        `;

    return html`
      <style>
        ${styles}
      </style>
      ${args.useWrapper
        ? html`
            <cds-aichat-tile-container>
              ${args.clickable
                ? html` <cds-clickable-tile>
                    ${tileContent}
                  </cds-clickable-tile>`
                : html` <cds-tile> ${tileContent} </cds-tile>`}
              ${buttons.length > 0
                ? html`<div class="${footerClass}">${buttons}</div>`
                : ""}
            </cds-aichat-tile-container>
          `
        : html`
            ${args.clickable
              ? html` <cds-clickable-tile> ${tileContent} </cds-clickable-tile>`
              : html` <cds-tile> ${tileContent} </cds-tile>`}
            ${buttons.length > 0
              ? html`<div class="${footerClass}">${buttons}</div>`
              : ""}
          `}
    `;
  },
};
