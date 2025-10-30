/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Polyfill DOM types that Carbon web components might reference in source maps.
 * This is needed because of an issue with @carbon/web-components source maps
 * pointing to TypeScript files that reference DOM types like Node.
 *
 * This must run at module load time (not just in globalSetup function)
 * to be available before test files are imported.
 */
if (typeof globalThis.Node === "undefined") {
  // @ts-ignore - adding minimal polyfill for DOM Node type
  globalThis.Node = class Node {};
}

/**
 * Global setup for Playwright tests.
 */
export default function globalSetup() {
  // Polyfill is set at module load time above
}
