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

import DomPurify from "dompurify";

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

/**
 * Sanitizes the given block of HTML to remove potentially malicious content. This will strip out everything that's
 * not in the allowed set provided by the library we're using here. We use the defaults for DOMPurify, but do allow
 * "target" to be set.
 */
function sanitizeHTML(content: string): string {
  return DomPurify.sanitize(content, { ADD_ATTR: ["target"] });
}

/**
 * Remove all HTML tags. We use an external library to make sure we don't forget any tags to forbid.
 * Custom HTML tags won't hurt anyone.
 */
function removeHTML(content: string): string {
  return DomPurify.sanitize(content, {
    ALLOWED_TAGS: [],
  });
}

export { isValidURL, sanitizeHTML, removeHTML };
