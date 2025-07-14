/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import memoizeOne from "memoize-one";

import ObjectMap from "../../../types/utilities/ObjectMap";

/**
 * Creates a memoizer that will take an array of keys and a map of those keys to values and return an array of
 * values that corresponds to those keys.
 *
 * This is optimized to only return a new array of values if the array would actually contain different values
 * (either in a different order or different values). It performs element-wise comparisons of both the requested
 * array of keys as well as only the specific values from the map. If the map has extra values that are not used,
 * those will be ignored.
 *
 * For example:
 * ['key1'], {key1: 'value1', key2: 'value2'} => ['value1']
 */
function createUnmappingMemoizer<V>(): (
  values: string[],
  map: ObjectMap<V>
) => V[] {
  return memoizeOne(
    (keys: string[], map: ObjectMap<V>) => keys.map((key) => map[key]),
    isUnmappingEqual
  );
}

/**
 * This function will determine if any of the specific messages used by this class have changed. Note: this could
 * be a little more efficient if it was pushed up higher in the component chain.
 */
function isUnmappingEqual<V>(
  newArgs: [string[], ObjectMap<V>],
  oldArgs: [string[], ObjectMap<V>]
): boolean {
  const [keys1, map1] = newArgs;
  const [keys2, map2] = oldArgs;

  if (keys1 === keys2 && map1 === map2) {
    // Both sets of arguments are the same.
    return true;
  }

  if (keys1.length !== keys2.length) {
    // The array are different sizes, so the values will not be the same.
    return false;
  }

  // Check each value one by one.
  for (let index = 0; index <= keys1.length; index++) {
    const key1 = keys1[index];
    const key2 = keys2[index];

    if (key1 !== key2) {
      // If a key is different, the values will be different.
      return false;
    }

    const value1 = map1[key1];
    const value2 = map2[key2];
    if (value1 !== value2) {
      // A value was found to be different.
      return false;
    }
  }

  // Everything found to be the same.
  return true;
}

export { createUnmappingMemoizer };
