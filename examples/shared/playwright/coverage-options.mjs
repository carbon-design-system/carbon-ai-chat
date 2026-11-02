/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Coverage settings shared by the Playwright fixture and the report script.
 * This module has no imports, so both Node and Playwright's TypeScript loader
 * accept it.
 */

/** Host the fixture gives built scripts, so each example keeps its own paths. */
export const COVERAGE_HOST = 'http://localhost';

/** Share of an example's `src/` lines its suite should run; advisory. */
export const MIN_LINES = 80;

/**
 * Examples whose concern cannot be checked deterministically, so their suites
 * prove a mount and any behavior that stays fixed. They are reported, not
 * flagged. An entry is a slug for both flavors or `<flavor>/<slug>` for one.
 */
export const DEFERRED_EXAMPLES = [
  // Random message counts and texts.
  'history-host-driven',
  // The history list renders a viewport height down, so no pinned item can be
  // picked; its concern test is a fixme.
  'web-components/history-fullscreen',
];

/**
 * Examples whose `src/customSendMessage.ts` copies the baseline mock back end
 * without being part of their concern. That back end is proven once, in
 * `basic-custom-element-fullscreen`, so these copies are left out of the target.
 */
export const OFF_CONCERN_BACKENDS = [
  'basic-custom-element-sidebar',
  'basic-custom-element-sidebar-narrow',
  'custom-element-as-float',
  'custom-element-as-float-lazy-load',
  'custom-element-lazy-load',
  'theme-plex-override',
];

/**
 * Monocart options for one example. `example` is its directory under
 * `examples/`, such as `react/feedback`.
 */
export function coverageOptions(outputDir, example) {
  const src = `examples/${example}/src`;
  return {
    name: `Coverage: ${example}`,
    outputDir,
    // Built sourcemaps name the example's own sources from its root, as
    // `src/App.tsx`. Package and third-party sources resolve elsewhere.
    sourcePath: (filePath) =>
      filePath.startsWith('src/')
        ? `examples/${example}/${filePath}`
        : filePath.replace(/^localhost\//, ''),
    // The bundle also holds the chat packages and third-party code.
    sourceFilter: {
      '**/node_modules/**': false,
      [`${src}/**`]: true,
      '**/*': false,
    },
    // List sources no test loaded, at zero.
    all: {
      dir: [src],
      filter: {
        '**/*.d.ts': false,
        '**/*.{test,spec}.*': false,
        '**/__tests__/**': false,
        '**/*.setup.ts': false,
        '**/*.{ts,tsx}': true,
        '**/*': false,
      },
    },
    reports: ['v8', 'lcovonly'],
  };
}
