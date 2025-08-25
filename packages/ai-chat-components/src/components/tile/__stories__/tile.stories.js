/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * @license
 *
 * Copyright IBM Corp. 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../tile";
import "../tile-body";
import "../tile-footer";
import { html } from "lit";

export default {
  title: "Components/Extended tile",
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
layerLevel: {
  control: {
    type: "select",
  },
  options: [undefined, "0", "1", "2"],
  labels: {
    undefined: "Unset",
    "0": "Level 0",
    "1": "Level 1",
    "2": "Level 2",
  },
}

  },
  decorators: [
    (story, context) =>
      html`<div style="max-width: ${context.args.maxWidth};">${story()}</div>`,
  ],
};

export const Default = {
  args: {
    maxWidth: "unset",
    layerLevel: undefined
  },

  render: (args) => html`
  <style>
    .cds-aichat-tile-body{
      background-color: red;
      padding: 1rem;
    }
  </style>
    <cds-aichat-tile layer-level=${args.layerLevel}>
      <cds-aichat-tile-body>
        <h5>Carbon Design System Component</h5>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Labore fuga
          enim officiis sint itaque maiores qui harum id impedit repellat?
        </p>
      </cds-aichat-tile-body>
      <cds-aichat-tile-footer>
        <p>footer takes fluid button set with container queries as slot</p>
      </cds-aichat-tile-footer>
    </cds-aichat-tile>
  `,
};
