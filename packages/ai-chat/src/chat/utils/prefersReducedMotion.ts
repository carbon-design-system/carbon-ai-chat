/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Returns whether the user agent currently reports
 * `prefers-reduced-motion: reduce`. Safe to call in non-browser environments.
 *
 * Prefer this over inlining `matchMedia` so all call sites stay consistent and
 * any future change (e.g. reacting to `MediaQueryList` change events) has a
 * single place to live.
 */
export function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
