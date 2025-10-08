/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RIGHT_TO_LEFT_MARK } from "./constants";

// A regex object that checks for white space/right-left-mark characters in a string and a period at the end of a
// string.
const UNWANTED_CHARACTERS_REGEX = new RegExp(
  `[ ${RIGHT_TO_LEFT_MARK}]|\\.$`,
  "g",
);

/**
 * Returns the date format data that tells us the character separating the date values. The provided value can either
 * be a date format like "mm/dd/yyyy" or an actual date like "01/01/1997".
 *
 * @param value The value to use to get format data.
 */
function sanitizeDateFormat(value: string) {
  let format = value.replace(UNWANTED_CHARACTERS_REGEX, "");

  // If there is no mm token, this means the month if represented with just one m.
  if (!format.includes("mm")) {
    format = format.replace("m", "mm");
  }
  // If there is no dd token, this means the month if represented with just one d.
  if (!format.includes("dd")) {
    format = format.replace("d", "dd");
  }

  return format;
}

/**
 * Returns a date string from the provided date format using a date object. This function assumes the format tokens
 * include mm, dd, and yyyy.
 *
 * @param date A Date object.
 * @param format The date format to reference.
 */
function toUserDateFormat(date: Date, format: string) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return format.replace("dd", day).replace("mm", month).replace("yyyy", year);
}

/**
 * Returns a date string that is formatted in the manner that the assistant expects. This format is yyyy-mm-dd to
 * help avoid ambiguity with the meaning of the date.
 */
function toAssistantDateFormat(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${year}-${month}-${day}`;
}

export { sanitizeDateFormat, toUserDateFormat, toAssistantDateFormat };
