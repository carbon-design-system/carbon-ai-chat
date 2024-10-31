/** @type { import('@storybook/web-components-vite').StorybookConfig } */
/**
 * @license
 *
 * Copyright IBM Corp. 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mergeConfig } from "vite";
import postcss from "rollup-plugin-postcss";
import postcssLit from "rollup-plugin-postcss-lit";
import sass from "sass";

const config = {
  stories: [
    "../src/**/__stories__/*.mdx",
    "../src/**/__stories__/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/web-components-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  features: {
    storyStoreV7: true,
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      css: {
        preprocessorOptions: {
          scss: {
            implementation: sass,
          },
        },
      },
      plugins: [
        postcss(),
        postcssLit({
          include: ["../node_modules", "../**/*.scss", "../**/*.scss?*"],
        }),
      ],
    });
  },
};
export default config;
