/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineConfig } from 'vitest/config';

const unit = ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx'];

export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic' },
    // Lit's decorators and class fields compile as the build compiles them
    // (`experimentalDecorators`, `useDefineForClassFields: false`).
    decorator: { legacy: true },
    assumptions: { setPublicClassFields: true },
    typescript: { removeClassFieldsWithoutInitializer: true },
  },
  // The React wrapper tests load the built `es/` and `es-custom/` output.
  // Resolve its dependencies with the `browser` export condition, as the
  // Jest files' `customExportConditions` did, so Lit loads its browser build.
  resolve: {
    conditions: ['browser'],
    dedupe: ['react', 'react-dom', 'lit', 'lit-html', 'lit-element'],
  },
  test: {
    globals: true,
    allowOnly: false,
    passWithNoTests: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    chaiConfig: { truncateThreshold: 0 },
    server: {
      deps: {
        inline: [
          '@carbon/ai-chat-components',
          '@carbon/web-components',
          'lit',
          'lit-html',
          'lit-element',
          '@lit/reactive-element',
          '@lit/react',
          '@lit/context',
          '@lit-labs/react',
        ],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', '**/__tests__/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'happy-dom',
          environment: 'happy-dom',
          include: [
            ...unit.map((glob) => `src/react/${glob}`),
            ...unit.map((glob) => `src/globals/${glob}`),
            ...unit.map((glob) => `.storybook/__tests__/${glob}`),
          ],
          // The Lit tests, and these two utility files, still run in
          // web-test-runner until they move to the browser project.
          exclude: [
            '**/node_modules/**',
            'src/globals/utils/__tests__/aria-announcer-manager.test.ts',
            'src/globals/utils/__tests__/focus-utils.test.ts',
          ],
        },
      },
    ],
  },
});
