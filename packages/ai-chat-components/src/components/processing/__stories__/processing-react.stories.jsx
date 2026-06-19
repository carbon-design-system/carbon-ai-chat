/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable */
import React from "react";

import Processing from "../../../react/processing";

export default {
  title: "Components/Processing",
};

const argTypes = {
  loop: { control: "boolean" },
  quickLoad: { control: "boolean" },
};

const renderProcessing = (args) => (
  <Processing loop={args.loop} quickLoad={args.quickLoad} />
);

export const QuickLoad = {
  args: {
    quickLoad: true,
    loop: true,
  },
  argTypes,
  render: renderProcessing,
};

export const LinearLoop = {
  args: {
    loop: true,
  },
  argTypes,
  render: renderProcessing,
};

export const LinearNoLoop = {
  args: {
    loop: false,
  },
  argTypes,
  render: renderProcessing,
};
