/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Determines if the given string is a "empty" string. That is a string that has no value or is the literal string
 * "null".
 */
function isEmptyString(value: string) {
  return !value || value === "null";
}

/**
 * Sometimes we are passed back "null" as a string! In that case, instead of showing "null" as a title or body, we
 * convert it to a real null value.
 *
 * @param str A string for the title or body of the search card.
 */
function convertToEmptyStringIfStringifiedNull(str: string) {
  return str === "null" ? null : str;
}

/**
 * Under the covers before it gets to us, a title/body may have been a stringified array. We need to remove the [""]
 * if that is the case.
 *
 * @param str A string for the title or body of the search card.
 */
function convertPossibleStringifiedArrayToFirstString(str: string): string {
  if (typeof str === "string" && str.startsWith('["') && str.endsWith('"]')) {
    try {
      [str] = JSON.parse(str);
    } catch (error) {
      // Not an array of strings, so do nothing.
    }
  }
  return str;
}

export {
  isEmptyString,
  convertToEmptyStringIfStringifiedNull,
  convertPossibleStringifiedArrayToFirstString,
};
