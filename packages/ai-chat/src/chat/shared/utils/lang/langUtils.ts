/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Miscellaneous JavaScript utilities.
 */

/**
 * Determines if the given value is null or undefined.
 */
function isNil(value: any): boolean {
  return value === undefined || value === null;
}

/**
 * Determines if a given number is odd.
 */
function isOdd(value: number): boolean {
  return Math.abs(value % 2) === 1;
}

export { isNil, isOdd };
