/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

"use strict";

import path from "path";
import { fileURLToPath } from "url";
import { rollup } from "rollup";
import autoprefixer from "autoprefixer";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import cssnano from "cssnano";
import fs from "fs";
import postcss from "postcss";
import replace from "@rollup/plugin-replace";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import fixHostPseudo from "../tools/postcss-fix-host-pseudo.js";
import license from "../tools/rollup-plugin-license.js";
import litSCSS from "../tools/rollup-plugin-lit-scss.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets all of the folders and returns out
 *
 * @param {string} dir Directory to check
 * @returns {string[]} List of folders
 * @private
 */
function _getFolders(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
}

/**
 * Builds all of the rollup bundles for all components
 */
async function buildDist() {
  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
  }

  const folders = _getFolders("src/components");

  for (let i = folders.length - 1; i >= 0; i--) {
    if (!fs.existsSync(`src/components/${folders[i]}/index.ts`)) {
      folders.splice(i, 1);
    }
  }

  return rollup(getRollupConfig({ folders }))
    .then((bundle) => {
      bundle.write({
        format: "es",
        dir: "dist",
        banner: "let process = { env: {} };",
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
}

/**
 * Generates the multi-input for the rollup config
 *
 * @param {Array} folders Package names as inputs
 * @returns {{}} Object with inputs
 * @private
 */
function _generateInputs(folders) {
  const inputs = {};

  folders.forEach((folder) => {
    inputs[`${folder}.min`] = `src/components/${folder}/index.ts`;
  });

  return inputs;
}

/**
 * Sets the rollup configuration based on various settings
 *
 * @param {object} [options] The build options.
 * @param {Array} [options.folders] Package names as inputs
 * @returns {object} The Rollup config.
 */
function getRollupConfig({ folders = [] } = {}) {
  const postCSSPlugins = [fixHostPseudo(), autoprefixer(), cssnano()];

  const licenseOptions = {
    whitelist: /^(carbon-components|@carbon*)$/i,
    async licenseSelf() {
      return `/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
`;
    },
  };

  return {
    input: _generateInputs(folders),
    plugins: [
      alias({
        entries: [{ find: /^(.*)\.scss\?lit$/, replacement: "$1.scss" }],
      }),
      nodeResolve({
        browser: true,
        mainFields: ["jsnext", "module", "main"],
        extensions: [".js", ".ts", ".tsx"],
      }),
      commonjs({
        include: [/node_modules/],
        sourceMap: true,
      }),
      typescript({
        noEmitOnError: true,
        declaration: false,
        compilerOptions: {
          rootDir: "src",
          outDir: "dist",
        },
      }),
      litSCSS({
        includePaths: [
          path.resolve(__dirname, "../node_modules"),
          path.resolve(__dirname, "../../../node_modules"),
        ],
        async preprocessor(contents, id) {
          return (await postcss(postCSSPlugins).process(contents, { from: id }))
            .css;
        },
      }),
      replace({
        "process.env.NODE_ENV": "production",
        preventAssignment: true,
      }),
      terser(),
      license(licenseOptions),
    ],
  };
}

buildDist().catch((error) => {
  console.log(error);
  process.exit(1);
});
