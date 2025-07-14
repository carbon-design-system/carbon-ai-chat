/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** @type { import('@storybook/web-components-vite').StorybookConfig } */

import { mergeConfig } from "vite";
import { litStyleLoader, litTemplateLoader } from "@mordech/vite-lit-loader";
import remarkGfm from "remark-gfm";

const config = {
  stories: [
    "../src/**/__stories__/*.mdx",
    "../src/**/__stories__/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
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
    // Merge custom configuration into the default config
    return mergeConfig(config, {
      plugins: [litStyleLoader(), litTemplateLoader()],
      optimizeDeps: {
        include: ["@storybook/web-components"],
        exclude: ["lit", "lit-html"],
      },
      define: {
        "process.env": process.env,
      },
      sourcemap: true,
    });
  },
};
export default config;
