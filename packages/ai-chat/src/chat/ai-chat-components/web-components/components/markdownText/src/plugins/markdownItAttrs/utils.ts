/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Token } from "markdown-it";

/**
 * Escapes special regex characters in a string for use in regular expressions.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Gets an element from an array, supporting negative indices for accessing from the end.
 */
export function get<T>(arr: T[], n: number): T | undefined {
  return n >= 0 ? arr[n] : arr[arr.length + n];
}

/**
 * Returns the last element of an array, or an empty object if the array is empty.
 */
export function last<T>(arr: T[]): T {
  return arr.slice(-1)[0] || ({} as T);
}

/**
 * Type guard to check if a value is a non-empty array of objects.
 */
export function isArrayOfObjects(
  arr: unknown,
): arr is Record<string, unknown>[] {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((i) => typeof i === "object")
  );
}

/**
 * Type guard to check if a value is a non-empty array of functions.
 */
export function isArrayOfFunctions(
  arr: unknown,
): arr is ((arg: unknown) => boolean)[] {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((i) => typeof i === "function")
  );
}

/**
 * Recursively hides a token and all its children by setting their hidden flag and clearing content.
 */
export function hidden(token: Token): void {
  token.hidden = true;
  token.children?.forEach((t) => {
    t.content = "";
    hidden(t);
  });
}
