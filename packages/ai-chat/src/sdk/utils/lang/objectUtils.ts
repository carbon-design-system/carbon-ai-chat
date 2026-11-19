/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Recursively deep freezes an object.
 */
function deepFreeze(object: any) {
  Object.freeze(object);

  Object.getOwnPropertyNames(object).forEach((prop) => {
    if (
      Object.prototype.hasOwnProperty.call(object, prop) &&
      object[prop] !== null &&
      (typeof object[prop] === 'object' ||
        typeof object[prop] === 'function') &&
      !Object.isFrozen(object[prop])
    ) {
      deepFreeze(object[prop]);
    }
  });

  return object;
}

/**
 * Deep freezes a copy made by `cloneDeep` from `original`, but leaves alone every value the copy
 * shares with the original. `cloneDeep` keeps functions, classes and other values it can't copy by
 * reference, and those belong to the host, so they stay as the host made them.
 *
 * `original` must be the exact source value copied into `copy`, including the matching subtree
 * when only part of a larger clone is passed.
 */
function deepFreezeCopy<T>(copy: T, original: unknown): T {
  if (Object.is(copy, original)) {
    return copy;
  }
  const object = copy as any;
  Object.freeze(object);
  Object.getOwnPropertyNames(object).forEach((prop) => {
    const value = object[prop];
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !Object.isFrozen(value)
    ) {
      const source =
        original !== null &&
        (typeof original === 'object' || typeof original === 'function')
          ? (original as any)[prop]
          : undefined;
      deepFreezeCopy(value, source);
    }
  });
  return copy;
}

export { deepFreeze, deepFreezeCopy };
