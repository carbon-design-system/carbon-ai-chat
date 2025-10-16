/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/processing";
import { html } from "lit";

export default {
  title: "Components/Processing",
};
const argTypes = {
  loop: Boolean,
  quickLoad: Boolean,
  carbonTheme: {
    control: { type: "select" },
    options: ["g100", "g90", "g10", "white"],
  },
};
export const QuickLoad = {
  args: {
    quickLoad: true,
    carbonTheme: "g10",
  },
  argTypes: argTypes,
  render: (args) =>
    html`<cds-aichat-processing
      ?quickLoad=${args.quickLoad}
      ?loop=${args.loop}
      carbonTheme=${args.carbonTheme}
    />`,
};

export const LinearLoop = {
  args: {
    loop: true,
    carbonTheme: "g10",
  },
  argTypes: argTypes,
  render: (args) =>
    html`<cds-aichat-processing
      ?quickLoad=${args.quickLoad}
      ?loop=${args.loop}
      carbonTheme=${args.carbonTheme}
    />`,
};

export const LinearNoLoop = {
  args: {
    loop: false,
    carbonTheme: "g10",
  },
  argTypes: argTypes,
  render: (args) => {
    return html` <cds-aichat-processing
      ?quickLoad=${args.quickLoad}
      ?loop=${args.loop}
      carbonTheme=${args.carbonTheme}
    />`;
  },
};
