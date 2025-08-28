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

export default {
  title: "Components/tile-container",
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
        .footer {
          display: flex;
          width: 100%;

          * {
            width: 100%;
          }
        }

        .footer.vertical {
          flex-direction: column;
        }

        h5 {
          margin-bottom: 12px;
        }

        /* Light DOM styles */
        /* Tiles border-radius */
        cds-aichat-tile-container cds-clickable-tile:first-child::part(link),
        cds-aichat-tile-container cds-tile:first-child::part(link) {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }

        cds-aichat-tile-container cds-clickable-tile:last-child::part(link),
        cds-aichat-tile-container cds-tile:last-child::part(link) {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }

        cds-aichat-tile-container cds-clickable-tile:only-child::part(link),
        cds-aichat-tile-container cds-tile:only-child::part(link) {
          border-radius: 8px;
        }

        /* Horizontal footer: first button bottom left last button bottom right radius */
        cds-aichat-tile-container
          .footer:not(.vertical)
          cds-button:first-child::part(button) {
          border-bottom-left-radius: 8px;
        }
        cds-aichat-tile-container
          .footer:not(.vertical)
          cds-button:last-child::part(button) {
          border-bottom-right-radius: 8px;
        }

        /* Vertical footer: last button gets bottom border radius */
        cds-aichat-tile-container
          .footer.vertical
          cds-button:last-child::part(button),
        cds-aichat-tile-container
          .footer.vertical
          cds-button:only-child::part(button) {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
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
