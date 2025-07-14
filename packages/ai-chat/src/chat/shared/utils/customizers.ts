/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains customizer functions for lodash utility functions that accept them.
 */

/**
 * Returns the new array value which will replace the current value since we don't want both values to get merged.
 */
function replaceCurrentArrayValue(currentValue: any, newValue: any) {
  if (Array.isArray(newValue)) {
    return newValue;
  }
  // Let the method itself handle merging non-array values.
  return undefined;
}

export { replaceCurrentArrayValue };
