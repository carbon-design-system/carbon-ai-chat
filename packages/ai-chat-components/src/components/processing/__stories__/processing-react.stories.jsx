/* eslint-disable */
import React from "react";

import Processing from "../../../react/processing";

export default {
  title: "Components/Processing",
};

const argTypes = {
  loop: { control: "boolean" },
  quickLoad: { control: "boolean" },
  carbonTheme: {
    control: { type: "select" },
    options: ["g100", "g90", "g10", "white"],
  },
};

const renderProcessing = (args) => (
  <Processing
    loop={args.loop}
    quickLoad={args.quickLoad}
    carbonTheme={args.carbonTheme}
  />
);

export const QuickLoad = {
  args: {
    quickLoad: true,
    carbonTheme: "g10",
  },
  argTypes,
  render: renderProcessing,
};

export const LinearLoop = {
  args: {
    loop: true,
    carbonTheme: "g10",
  },
  argTypes,
  render: renderProcessing,
};

export const LinearNoLoop = {
  args: {
    loop: false,
    carbonTheme: "g10",
  },
  argTypes,
  render: renderProcessing,
};
