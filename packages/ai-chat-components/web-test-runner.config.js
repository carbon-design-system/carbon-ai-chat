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
import { esbuildPlugin } from "@web/dev-server-esbuild";
import litcss from "web-dev-server-plugin-lit-css";
import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: ["src/**/*.test.ts"],
  plugins: [
    litcss({
      include: ["**/*.scss"],
      cssnano: true,
    }),
    esbuildPlugin({ ts: true }),
  ],
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" }),
  ],
};
