/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { consoleError } from "../miscUtils";

/**
 * Determines if the given string is a "empty" string. That is a string that has no value or is the literal string
 * "null".
 */
function isEmptyString(value: string) {
  return !value || value === "null";
}

/**
 * Attempts to parse the given value into a JSON object. Returns a boolean indicating success.
 */
function isJsonString(data: any) {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
}

function parseUnknownDataToMarkdown(data: unknown) {
  let content: string;
  if (data) {
    try {
      if (typeof data === "object") {
        content = `\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
      } else if (typeof data === "string") {
        if (isJsonString(data)) {
          content = `\`\`\`\n${JSON.stringify(
            JSON.parse(data),
            null,
            2,
          )}\n\`\`\`\n`;
        } else {
          content = data;
        }
      } else {
        content = String(data);
      }
      return content;
    } catch (e) {
      consoleError("Cannot parse step content", e);
    }
  }
  return undefined;
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
  parseUnknownDataToMarkdown,
};
