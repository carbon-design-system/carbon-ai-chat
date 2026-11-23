/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { litStyleLoader } from '@mordech/vite-lit-loader';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { browserCommands } from './src/__tests__/browser/commands';

const here = path.dirname(fileURLToPath(import.meta.url));
const unit = ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx'];
// The happy-dom project's exclude hands each browser test here, from the same
// folders, so a test file runs in exactly one project.
const browserUnit = unit.map((glob) =>
  glob.replace('.test.', '.browser.test.')
);
const testRoots = ['src', '.storybook/__tests__'];

// Chromium by default. CAIC_ALL_BROWSERS=1 adds Firefox and WebKit, as the
// nightly jobs do.
const browsers =
  process.env.CAIC_ALL_BROWSERS === '1'
    ? (['chromium', 'firefox', 'webkit'] as const)
    : (['chromium'] as const);

export default defineConfig({
  // `*.scss?lit` imports compile to Lit `CSSResult`s, as the build does.
  plugins: [litStyleLoader()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bare `@forward '@carbon/utilities'` chains from `@carbon/styles`
        // need explicit node_modules load paths, as in Storybook.
        loadPaths: [
          path.resolve(here, 'node_modules'),
          path.resolve(here, '../../node_modules'),
        ],
        // web-test-runner compiled every stylesheet with this prefix.
        additionalData:
          '$feature-flags: (enable-css-custom-properties: true);\n',
      },
    },
  },
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
          include: testRoots.flatMap((root) =>
            unit.map((glob) => `${root}/${glob}`)
          ),
          exclude: ['**/node_modules/**', '**/*.browser.test.*'],
        },
      },
      {
        extends: true,
        // web-test-runner's page set `process.env.NODE_ENV` to
        // "development".
        define: {
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        resolve: {
          // web-test-runner served Lit's development build, which reports
          // binding mistakes and other dev-only warnings. Keep it here.
          conditions: ['browser', 'development'],
          alias: {
            '@web/test-runner-commands': path.resolve(
              here,
              'src/__tests__/browser/wtr-commands-stub.ts'
            ),
          },
        },
        test: {
          name: 'browser',
          include: testRoots.flatMap((root) =>
            browserUnit.map((glob) => `${root}/${glob}`)
          ),
          // One file at a time in CI, as web-test-runner's `concurrency: 1`.
          fileParallelism: !process.env.CI,
          browser: {
            enabled: true,
            headless: true,
            ui: false,
            provider: playwright(),
            // web-test-runner sized every test page to 800x600
            // (@web/test-runner-playwright's PlaywrightLauncherPage). Layout
            // decisions such as the shell's workspace placement depend on it.
            viewport: { width: 800, height: 600 },
            // Firefox runs one file at a time everywhere, as web-test-runner
            // did: concurrent Firefox pages can stall native selection
            // gestures and overlap later tests.
            instances: browsers.map((browser) =>
              browser === 'firefox'
                ? { browser, fileParallelism: false }
                : { browser }
            ),
            commands: browserCommands,
            // Failure screenshots go with the other run attachments, which
            // git ignores; `__screenshots__/` stays free for reference images.
            screenshotDirectory: '.vitest-attachments/screenshots',
          },
        },
      },
    ],
  },
});
