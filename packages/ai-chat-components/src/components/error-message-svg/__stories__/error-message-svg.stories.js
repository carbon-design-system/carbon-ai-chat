/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/error-message-svg";
import "./error-message-svg-story.css";
import { html } from "lit";

export default {
  title: "Components/Error message svg",
  component: "cds-aichat-error-message-svg",
};

const argTypes = {
  theme: {
    control: { type: "select" },
    options: ["light", "dark"],
  },
};

export const Default = {
  args: {
    theme: "light",
  },
  argTypes,
  render: (args) =>
    html`<div class="error-message-svg-story__wrapper">
      <cds-aichat-error-message-svg
        theme=${args.theme}
      ></cds-aichat-error-message-svg>
    </div>`,
};
