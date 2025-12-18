/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mergeConfig } from "vite";
import remarkGfm from "remark-gfm";
import { litStyleLoader, litTemplateLoader } from "@mordech/vite-lit-loader";

const require = createRequire(import.meta.url);

export default {
  stories: [
    "./welcome/welcome.mdx",
    "../src/**/__stories__/*-react.mdx",
    "../src/**/__stories__/*.stories.@(jsx|tsx)",
  ],
  addons: [
    {
      name: getAbsolutePath("@storybook/addon-docs"),
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-a11y"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  features: {
    storyStoreV7: true,
  },
  docs: {
    defaultName: "Overview",
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [litStyleLoader(), litTemplateLoader()],
      optimizeDeps: {
        exclude: ["lit", "lit-html"],
      },
    });
  },
};

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
