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
    buttonCount: {
      control: "select",
      options: [0, 1, 2, 3],
      description: "Number of buttons to render in the footer",
    },
    clickable: {
      control: "boolean",
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
    buttonCount: 1,
  },
  render: (args) => {
    const kinds = ["secondary", "primary", "danger"];

    const buttons = Array.from({ length: args.buttonCount }, (_, i) => {
      const kind = kinds[i] ?? "primary"; // fallback to primary if more than 3
      return html`<cds-button kind=${kind}>Action ${i + 1}</cds-button>`;
    });

    const heading = args.useWrapper
      ? args.clickable
        ? "AI Chat Clickable Tile"
        : "AI Chat Tile"
      : args.clickable
        ? "Clickable Tile"
        : "Tile";

    const tileContent = html`
      <h5>${heading}</h5>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Labore fuga
        enim officiis sint itaque maiores qui harum id impedit repellat?
      </p>
    `;

    const footerClass = args.buttonCount === 3 ? "footer vertical" : "footer";

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
              ${args.buttonCount > 0
                ? html`<div class="${footerClass}">${buttons}</div>`
                : ""}
            </cds-aichat-tile-container>
          `
        : html`
            ${args.clickable
              ? html` <cds-clickable-tile> ${tileContent} </cds-clickable-tile>`
              : html` <cds-tile> ${tileContent} </cds-tile>`}
            ${args.buttonCount > 0
              ? html`<div class="${footerClass}">${buttons}</div>`
              : ""}
          `}
    `;
  },
};
