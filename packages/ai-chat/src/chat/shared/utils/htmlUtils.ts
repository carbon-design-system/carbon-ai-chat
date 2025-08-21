/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Miscellaneous utilities for dealing with HTML.
 */

import { isEmptyString } from "./lang/stringUtils";

/**
 * Determines if the given string represents a valid URL. This is a very very very lazy check but a more robust check
 * has performance issues.
 */
function isValidURL(string: string) {
  if (isEmptyString(string)) {
    return false;
  }
  // For performance, lets short circuit doing the full regex check if the url doesn't have any basics.
  return string.includes("http://") || string.includes("https://");
}

export { isValidURL };
