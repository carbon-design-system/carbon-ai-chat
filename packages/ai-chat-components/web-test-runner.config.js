/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

//
// Copyright IBM Corp. 2025
//
// This source code is licensed under the Apache-2.0 license found in the
// LICENSE file in the root directory of this source tree.
//
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import * as sass from "sass";
import { esbuildPlugin } from "@web/dev-server-esbuild";
import litcss from "web-dev-server-plugin-lit-css";
import { playwrightLauncher } from "@web/test-runner-playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sassIncludePaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];
const featureFlags = `$feature-flags: (
  enable-css-custom-properties: true,
);`;
const tsconfigFile = path.resolve(__dirname, "tsconfig.json");

export default {
  files: ["src/**/*.test.ts"],
  // https://modern-web.dev/docs/test-runner/cli-and-configuration/#test-runner-html
  testRunnerHtml: (testFramework) =>
    `<!DOCTYPE html>
    <html>
      <body>
        <script>window.process = { env: { NODE_ENV: "development" } }</script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
  plugins: [
    litcss({
      include: ["**/*.scss"],
      cssnano: true,
      transform: (data, { filePath }) => {
        const normalizedFilePath = filePath.replace(/\?lit$/, "");
        const sassFilePath = path.join(
          __dirname,
          normalizedFilePath.startsWith("/")
            ? `.${normalizedFilePath}`
            : normalizedFilePath,
        );
        return sass.compileString(`${featureFlags}\n${data}`, {
          url: pathToFileURL(sassFilePath),
          loadPaths: sassIncludePaths,
        }).css;
      },
    }),
    esbuildPlugin({ ts: true, tsconfig: tsconfigFile }),
  ],
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" }),
  ],
};
