/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineConfig } from 'vitest/config';
import { inheritedEnumStrings } from './tests/setup/inheritedEnumStrings';
import { chatStyleStrings } from './tests/setup/styleStrings';

const root = import.meta.dirname;
const tests = ['**/*.test.ts', '**/*.test.tsx'];

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
    setupFiles: ['tests/setup/index.ts'],
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
          // The SDK runs headless, so its tests get no DOM. A file that proves
          // the SDK leaves a browser API alone opts into one (D5).
          environment: 'node',
          include: tests.flatMap((glob) => [
            `src/sdk/${glob}`,
            `tests/${glob}`,
          ]),
        },
      },
      {
        extends: true,
        test: {
          name: 'happy-dom',
          maxWorkers: 0,
          include: tests.map((glob) => `src/${glob}`),
          exclude: ['src/sdk/**', '**/node_modules/**'],
        },
      },
    ],
  },
});
