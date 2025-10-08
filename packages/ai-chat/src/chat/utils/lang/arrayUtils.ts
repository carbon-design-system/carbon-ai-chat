/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ObjectMap from "../../../types/utilities/ObjectMap";

/**
 * Coerces the given value into an array. If the value is already an array, it is returned as-is. Otherwise it is
 * returned as a new array that contains the value as a single entry.
 *
 * @param value The value that's either an array or should be put into an array.
 */
function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Executes an asynchronous "forEach" over the given array with the given callback function. The values are executed
 * in series (as opposed to in parallel). The array may not be modified during the loop.
 *
 * @param array The array to execute the loop over.
 * @param callbackFunction The function to call for each value in the array. The return value from the function will
 * be awaited which means if the value is a Promise, the loop will block until the Promise is resolved. The function
 * does not have to return a Promise in which case no waiting will occur.
 */
async function asyncForEach<T>(
  array: T[],
  callbackFunction: (value: T, index: number, array: T[]) => unknown,
) {
  for (let index = 0; index < array.length; index++) {
    const value = array[index];
    // eslint-disable-next-line no-await-in-loop
    await callbackFunction(value, index, array);
  }
}

/**
 * Finds the last value in the given array that matches according to the provided predicate. The search will
 * begin from the end of the array and continue backwards until a match is found.
 *
 * @param array The array to search through.
 * @param predicate The function used to determine if each value matches.
 * @param startAt The index to start at in the array. Defaults to length -1.
 * @returns Returns the array value that was found to match or undefined if no match was found.
 */
function findLast<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => boolean,
  startAt?: number,
): T {
  const lastIndex = findLastIndex(array, predicate, startAt);
  return lastIndex === -1 ? undefined : array[lastIndex];
}

/**
 * Finds the last value in the given array that matches according to the provided predicate. The search will
 * begin from the end of the array and continue backwards until a match is found.
 *
 * @param array The array to search through.
 * @param predicate The function used to determine if each value matches.
 * @param startAt The index to start at in the array. Defaults to length -1.
 * @returns Returns the array index that was found to match or -1 if no match was found.
 */
function findLastIndex<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => boolean,
  startAt?: number,
): number {
  if (array) {
    const startingIndex = startAt === undefined ? array.length - 1 : startAt;

    for (let index = startingIndex; index >= 0; index--) {
      const value = array[index];
      if (predicate(value, index, array)) {
        return index;
      }
    }
  }
  return -1;
}

/**
 * Finds the last value in the given array whose matching object from the given map matches according to the
 * provided predicate. The search will begin from the end of the array and continue backwards until a match is
 * found. This functionality basically works the same as {@link findLast} except that it will retrieve the object
 * from the map for the given id and use the predicate on that object.
 *
 * @param keys The array to search through.
 * @param map The map that contains the objects to look for. The object will be looked up using the key from the
 * provided array.
 * @param predicate The function used to determine if each value matches.
 * @returns Returns the array value that was found to match or undefined if no match was found.
 */
function findLastWithMap<T>(
  keys: string[],
  map: ObjectMap<T>,
  predicate: (value: T, index: number, array: string[]) => boolean,
): T {
  for (let index = keys.length - 1; index >= 0; index--) {
    const key = keys[index];
    const value = map[key];
    if (predicate(value, index, keys)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Returns the last value of the given array.
 */
function arrayLastValue<T>(array: T[]): T {
  return array && array.length ? array[array.length - 1] : null;
}

export { asArray, asyncForEach, findLast, findLastWithMap, arrayLastValue };
