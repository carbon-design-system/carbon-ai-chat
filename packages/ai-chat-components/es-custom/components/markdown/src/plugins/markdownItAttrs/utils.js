/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Escapes special regex characters in a string for use in regular expressions.
 */
function escapeRegExp(s) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
/**
 * Gets an element from an array, supporting negative indices for accessing from the end.
 */
function get(arr, n) {
    return n >= 0 ? arr[n] : arr[arr.length + n];
}
/**
 * Returns the last element of an array, or an empty object if the array is empty.
 */
function last(arr) {
    return arr.slice(-1)[0] || {};
}
/**
 * Type guard to check if a value is a non-empty array of objects.
 */
function isArrayOfObjects(arr) {
    return (Array.isArray(arr) &&
        arr.length > 0 &&
        arr.every((i) => typeof i === "object"));
}
/**
 * Type guard to check if a value is a non-empty array of functions.
 */
function isArrayOfFunctions(arr) {
    return (Array.isArray(arr) &&
        arr.length > 0 &&
        arr.every((i) => typeof i === "function"));
}
/**
 * Recursively hides a token and all its children by setting their hidden flag and clearing content.
 */
function hidden(token) {
    token.hidden = true;
    token.children?.forEach((t) => {
        t.content = "";
        hidden(t);
    });
}

export { escapeRegExp, get, hidden, isArrayOfFunctions, isArrayOfObjects, last };
//# sourceMappingURL=utils.js.map
