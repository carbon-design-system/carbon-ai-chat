/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "src/vitest.setup.ts",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        inline: [
          "@carbon/ai-chat-components",
          "@carbon/web-components",
          "react-player",
          "swiper",
        ],
      },
    },
    testTimeout: 15000,
  },
});
