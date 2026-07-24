/*
 *  Copyright IBM Corp. 2025, 2026
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
  // The default 120s per-file session budget is too tight under full parallel
  // load: slow-to-load files (e.g. carousel imports in ~36s cold) exceed it and
  // fail with "Browser tests did not finish within 120000ms". Raise the ceiling —
  // healthy files still finish in seconds.
  testsFinishTimeout: 300000,
  // Default concurrency is ~cores/2 per browser (× 2 concurrent browsers), which
  // floods the CPU with simultaneous lazy `import()`s and starves renders — the
  // root cause of the timeout flakes. Cap it; tune 2–4 (lower for CI, higher
  // locally) to trade wall-clock for stability.
  concurrency: 3,
  // Cold Firefox/WebKit starts can exceed the 30s default under load.
  browserStartTimeout: 60000,
  // Mocha's default 2s per-test timeout is too tight for this suite on Chromium
  // under full parallel load — async DOM work and lazy `import()`s (e.g. Tiptap
  // in prompt-line, see #1578) can approach 2s cold. Give every test headroom.
  testFramework: {
    config: {
      timeout: "10000",
    },
  },
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
