/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React from "react";

import ErrorMessageSVG from "../../../react/error-message-svg";
import "./error-message-svg-story.css";

export default {
  title: "Components/Error message svg",
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
  render: (args) => (
    <div className="error-message-svg-story__wrapper">
      <ErrorMessageSVG theme={args.theme} />
    </div>
  ),
};
