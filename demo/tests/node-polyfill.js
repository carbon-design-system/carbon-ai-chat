/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/* eslint-env es2020 */

/**
 * Polyfill for DOM Node type to work around Carbon Web Components source map issue.
 * This file must be loaded before any modules that import Carbon web components.
 *
 * The issue: @carbon/web-components has source maps pointing to TypeScript files
 * that reference DOM types like `Node`, but these files don't exist in node_modules
 * and cause "Node is not defined" errors during test module loading.
 */

if (typeof globalThis.Node === "undefined") {
  globalThis.Node = class Node {};
  console.log(
    "[Test Setup] Polyfilled globalThis.Node for Carbon web components compatibility",
  );
}
