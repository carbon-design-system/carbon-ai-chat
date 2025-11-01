/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { esbuildPlugin } from "@web/dev-server-esbuild";
import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: ["src/**/*.test.ts"],
  nodeResolve: true,
  plugins: [
    {
      name: "stub-scss",
      resolveMimeType(context) {
        if (context.path.endsWith(".scss")) {
          return "js";
        }
        return undefined;
      },
      transform(context) {
        if (context.path.endsWith(".scss")) {
          return 'export default "";';
        }
        return undefined;
      },
    },
    esbuildPlugin({
      ts: true,
      json: true,
      tsconfig: "tsconfig.json",
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    }),
  ],
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" }),
  ],
};
