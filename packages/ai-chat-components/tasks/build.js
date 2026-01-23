/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

import { fileURLToPath } from "url";
import { globby } from "globby";
import { rollup, watch } from "rollup";
import alias from "@rollup/plugin-alias";
import autoprefixer from "autoprefixer";
import commonjs from "@rollup/plugin-commonjs";
import cssnano from "cssnano";
import litSCSS from "../tools/rollup-plugin-lit-scss.js";
import nodeResolve from "@rollup/plugin-node-resolve";
import path from "path";
import postcss from "postcss";
import { readFileSync } from "fs";
import fs from "fs-extra";
import typescript from "@rollup/plugin-typescript";

const packageJson = JSON.parse(readFileSync("./package.json"));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchMode = process.argv.includes("--watch");

async function build() {
  const esInputs = await globby([
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts",
    "!src/**/*.stories.ts",
    "!src/**/*.d.ts",
    "!src/globals/internal/storybook-cdn.ts",
  ]);

  const entryPoint = {
    rootDir: "src",
    outputDirectory: path.resolve(__dirname, ".."),
  };

  const formats = [
    {
      type: "esm",
      directory: "es",
    },
  ];

  for (const format of formats) {
    const outputDirectory = path.join(
      entryPoint.outputDirectory,
      format.directory,
    );

    const cwcInputConfig = getRollupConfig(
      esInputs,
      entryPoint.rootDir,
      outputDirectory,
    );

    if (watchMode) {
      const watcher = watch({
        ...cwcInputConfig,
        output: {
          dir: outputDirectory,
          format: format.type,
          preserveModules: true,
          preserveModulesRoot: "src",
          banner,
          exports: "named",
          sourcemap: true,
        },
      });

      watcher.on("event", (event) => {
        if (event.code === "START") {
          console.log("Building ai-chat-components...");
        } else if (event.code === "END") {
          console.log("Build complete");
        } else if (event.code === "ERROR") {
          console.error("Build error:", event.error);
        }
      });
    } else {
      const cwcBundle = await rollup(cwcInputConfig);

      await cwcBundle.write({
        dir: outputDirectory,
        format: format.type,
        preserveModules: true,
        preserveModulesRoot: "src",
        banner,
        exports: "named",
        sourcemap: true,
      });
    }
  }
  await postBuild();
}

const banner = `/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
`;

function getRollupConfig(input, rootDir, outDir) {
  return {
    input,
    // Mark dependencies listed in `package.json` as external so that they are
    // not included in the output bundle.
    external: [
      ...Object.keys(packageJson.dependencies),
      ...Object.keys(packageJson.devDependencies),
    ].map((name) => {
      // Transform the name of each dependency into a regex so that imports from
      // nested paths are correctly marked as external.
      //
      // Example:
      // import 'module-name';
      // import 'module-name/path/to/nested/module';
      return new RegExp(`^${name}(/.*)?`);
    }),
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
      }),
      litSCSS({
        includePaths: [
          path.resolve(__dirname, "../node_modules"),
          path.resolve(__dirname, "../../../node_modules"),
        ],
        async preprocessor(contents, id) {
          return (
            await postcss([autoprefixer(), cssnano()]).process(contents, {
              from: id,
            })
          ).css;
        },
      }),
      typescript({
        noEmitOnError: true,
        compilerOptions: {
          rootDir,
          outDir,
        },
      }),
    ],
  };
}

build().catch((error) => {
  console.log(error);
  process.exit(1);
});

// TODO: remove once @carbon/web-components supports scoped elements!
async function postBuild() {
  const sourceDir = path.resolve(__dirname, "../es");

  if (sourceDir) {
    const targetDir = path.resolve(__dirname, "../es-custom");

    // Copy `es` directory to `es-custom`
    await fs.copy(sourceDir, targetDir);

    // Find all files in the `es-custom` directory
    const files = await globby([`${targetDir}/**/*`], { onlyFiles: true });

    // Replace "cds" (not "cds-aichat") with "cds-custom" in all files
    await Promise.all(
      files.map(async (file) => {
        const content = await fs.promises.readFile(file, "utf8");
        let updatedContent = content
          // 1) Fix import paths
          .replace(
            /@carbon\/web-components\/es/g,
            "@carbon/web-components/es-custom",
          )
          // 2) Replace cds → cds-custom except cds-aichat
          .replace(/\bcds\b(?!-aichat)/g, "cds-custom");
        await fs.promises.writeFile(file, updatedContent);
      }),
    );
  }
}
