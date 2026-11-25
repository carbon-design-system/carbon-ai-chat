/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** Whether a relative path names a test tree rather than production source. */
export function isTestPath(file: string): boolean {
  return /(?:^|\/)(?:__tests__|tests)(?:\/|$)/.test(file.replaceAll('\\', '/'));
}
