/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Normalizes CommonJS and ESM default exports so that dynamically imported
 * modules always return the actual value we care about (component, class, etc).
 *
 * Some libraries (like `react-player`) can emit shapes such as:
 *   { default: Component }
 *   { default: { default: Component } }
 *   Component
 *
 * This helper unwraps those nested `default` properties until it reaches either
 * a primitive, a function, or an object without a `default` field.
 */
export function normalizeModuleInterop<T>(mod: T): any {
  let resolved: any = mod;

  while (
    resolved &&
    typeof resolved === "object" &&
    "default" in resolved &&
    resolved.default !== resolved
  ) {
    resolved = resolved.default;
  }

  return resolved;
}
