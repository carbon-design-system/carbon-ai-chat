/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Determines if the document is in RTL (right-to-left) mode.
 * Checks both document.dir and document.documentElement.dir for maximum compatibility.
 *
 * @returns true if the document is in RTL mode, false otherwise
 */
export function isDirectionRTL(): boolean {
  if (!document) {
    return false;
  }

  return document.dir === "rtl" || document.documentElement.dir === "rtl";
}
