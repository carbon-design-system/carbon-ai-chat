/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { inheritedEnumStrings } from './tests/setup/inheritedEnumStrings';
import { chatStyleStrings } from './tests/setup/styleStrings';

const root = import.meta.dirname;
const tests = ['**/*.test.ts', '**/*.test.tsx'];
const browserTests = ['**/*.browser.test.ts', '**/*.browser.test.tsx'];

// Chromium by default. CAIC_ALL_BROWSERS=1 adds Firefox and WebKit, as the
// nightly jobs do.
const browsers =
  process.env.CAIC_ALL_BROWSERS === '1'
    ? (['chromium', 'firefox', 'webkit'] as const)
    : (['chromium'] as const);

export default defineConfig({
  root,
  plugins: [chatStyleStrings(root), inheritedEnumStrings(root)],
  oxc: {
    jsx: { runtime: 'automatic' },
    // Lit's decorators and class fields compile as the build compiles them
    // (`experimentalDecorators`, `useDefineForClassFields: false`).
    decorator: { legacy: true },
    assumptions: { setPublicClassFields: true },
    typescript: { removeClassFieldsWithoutInitializer: true },
  },
  // Resolve packages with the export conditions Jest used: `browser` in a DOM
  // environment (jsdom's default) and `node` in Node, never `development`.
  resolve: {
    conditions: ['browser'],
    dedupe: ['react', 'react-dom', 'lit', 'lit-html', 'lit-element'],
  },
  ssr: { resolve: { conditions: ['node'], externalConditions: ['node'] } },
  test: {
    globals: true,
    allowOnly: false,
    passWithNoTests: false,
    environment: 'happy-dom',
    testTimeout: 10_000,
    // Jest's cap: half the cores, so a full run leaves the machine room and
    // its DOM-heavy workers don't crowd each other out.
    maxWorkers: '50%',
    hookTimeout: 10_000,
    // Jest printed each-table values in full. Vitest truncates them at 40
    // characters by default, in titles and assertion messages.
    chaiConfig: { truncateThreshold: 0 },
    // Fake what Jest's modern timers faked, except process.nextTick: the forks
    // pool cannot fake it, and no code under test calls it.
    fakeTimers: {
      toFake: [
        'Date',
        'hrtime',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
      loopLimit: 100_000,
    },
    css: { include: [/\.s?css(?:\?|$)/] },
    // Jest's jsdom resolver used the `browser` export condition and never
    // `node`. Vite resolves inlined packages with each environment's
    // conditions, so happy-dom files get Lit's browser builds, as under Jest,
    // and every Lit import shares one copy.
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
      exclude: ['src/**/*.d.ts', '**/__tests__/**', 'src/**/index.ts'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
    },
    // Each project inherits `maxWorkers` through `extends`, and Vitest reads a
    // project's own value before the root's, which is the only one a CLI
    // `--maxWorkers` changes. `0` unsets the inherited value, so both projects
    // share the root's worker count: the flag when given, half the cores if not.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          maxWorkers: 0,
          setupFiles: ['tests/setup/index.ts'],
          // The SDK runs headless, so its tests get no DOM. A file that proves
          // the SDK leaves a browser API alone opts into one (D5).
          environment: 'node',
          include: tests.flatMap((glob) => [
            `src/sdk/${glob}`,
            `tests/${glob}`,
          ]),
          exclude: ['**/node_modules/**', '**/*.browser.test.*'],
        },
      },
      {
        extends: true,
        test: {
          name: 'happy-dom',
          maxWorkers: 0,
          setupFiles: ['tests/setup/index.ts'],
          include: tests.map((glob) => `src/${glob}`),
          exclude: ['src/sdk/**', '**/node_modules/**', '**/*.browser.test.*'],
        },
      },
      {
        extends: true,
        // A page has no `process`. Give the chat the same values a test saw
        // under Jest: no VERSION, and NODE_ENV "test".
        define: {
          'process.env.VERSION': 'undefined',
          'process.env.NODE_ENV': JSON.stringify('test'),
        },
        // The JSX dev runtime is found only after the first test file loads,
        // and optimizing it then reloads the page mid-run. Optimize it up front.
        optimizeDeps: { include: ['react/jsx-dev-runtime'] },
        test: {
          name: 'browser',
          maxWorkers: 0,
          // Its own setup: the happy-dom shims stand in for what a real
          // browser already has.
          setupFiles: ['tests/setup/browser.ts'],
          include: browserTests.map((glob) => `src/${glob}`),
          // One file at a time in CI, as components' browser project runs.
          fileParallelism: !process.env.CI,
          browser: {
            enabled: true,
            headless: true,
            ui: false,
            provider: playwright(),
            // The same page size as components' browser tests.
            viewport: { width: 800, height: 600 },
            // Concurrent Firefox pages can stall focus and selection, so
            // Firefox runs one file at a time everywhere.
            instances: browsers.map((browser) =>
              browser === 'firefox'
                ? { browser, fileParallelism: false }
                : { browser }
            ),
            // Failure screenshots go with the other run attachments, which
            // git ignores.
            screenshotDirectory: '.vitest-attachments/screenshots',
          },
        },
      },
    ],
  },
});
