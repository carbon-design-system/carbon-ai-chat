// This file has been automatically migrated to valid ESM format by Storybook.
/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** @type { import('@storybook/web-components-vite').StorybookConfig } */

import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { litStyleLoader, litTemplateLoader } from "@mordech/vite-lit-loader";
import remarkGfm from "remark-gfm";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sassLoadPaths = [
  resolve(__dirname, "../node_modules"),
  resolve(__dirname, "../../../node_modules"),
];

const config = {
  stories: [
    "./welcome/welcome.mdx",
    "./welcome/styling-and-modifiers.mdx",
    "../src/**/__stories__/!(*-react).mdx",
    "../src/**/__stories__/*.stories.@(js|ts)",
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
    name: getAbsolutePath("@storybook/web-components-vite"),
    options: {},
  },

  docs: {
    defaultName: "Overview",
  },

  async viteFinal(config) {
    // Merge custom configuration into the default config
    return mergeConfig(config, {
      plugins: [litStyleLoader(), litTemplateLoader()],
      optimizeDeps: {
        include: ["@storybook/web-components-vite"],
        exclude: ["lit", "lit-html"],
      },
      define: {
        "process.env": process.env,
      },
      sourcemap: true,
      // @carbon/web-components emits selectors like
      // `:host(cds-button) .cds--btn ::slotted([slot=icon]) path` that
      // lightningcss rejects (a pseudo-element followed by a descendant).
      // Use esbuild's more permissive minifier instead.
      build: { cssMinify: "esbuild" },
      // Bare `@forward '@carbon/utilities'` chains from `@carbon/styles` need
      // explicit node_modules load paths; matches web-test-runner.config.js.
      css: {
        preprocessorOptions: {
          scss: { loadPaths: sassLoadPaths },
        },
      },
    });
  },
};
export default config;

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
