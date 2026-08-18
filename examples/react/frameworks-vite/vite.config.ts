/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Vite 8 minifies CSS with Lightning CSS by default. `@carbon/styles`
    // 1.113.0 emits `@position-try` blocks that wrap a selector (Sass bubbles
    // the enclosing rule into the at-rule), which Lightning CSS rejects as a
    // parse error. esbuild passes the unknown at-rule through untouched.
    // Remove this once @carbon/styles emits declaration-only `@position-try`.
    cssMinify: 'esbuild',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: 'src/vitest.setup.ts',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: ['@carbon/ai-chat-components', '@carbon/web-components'],
      },
    },
    testTimeout: 15000,
  },
});
