/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import remarkGfm from "remark-gfm";
import { litStyleLoader, litTemplateLoader } from "@mordech/vite-lit-loader";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sassLoadPaths = [
  resolve(__dirname, "../node_modules"),
  resolve(__dirname, "../../../node_modules"),
];

export default {
  stories: [
    "./welcome/welcome.mdx",
    "./welcome/styling-and-modifiers.mdx",
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
      resolve: {
        alias: {
          // `@vscode/markdown-it-katex` does `require("katex")`, which resolves
          // KaTeX's CommonJS build. Vite 8's rolldown bundler mangles the
          // lone-surrogate escapes (`\uD800-\uDFFF`) in KaTeX's lexer regex
          // into U+FFFD when it transforms that CJS build, breaking tokenizing
          // of every `\command`. Forcing the ESM build (which rolldown leaves
          // intact) fixes the KaTeX markdown-it plugin story.
          katex: require.resolve("katex/dist/katex.mjs"),
        },
      },
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

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
