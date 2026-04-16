/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Recursively search through shadow DOMs for a matching element.
 * Useful for querying elements nested inside multiple layers of
 * shadow roots (e.g. in tests or cross-component coordination).
 */
export function deepQuerySelector(
  root: ShadowRoot | Element | Document,
  selector: string,
): Element | null {
  const direct = (root as Element).querySelector(selector);
  if (direct) {
    return direct;
  }
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) {
      const found = deepQuerySelector(shadow, selector);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
