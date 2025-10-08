/*
 *  Copyright IBM Corp. 2025
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
      (typeof object[prop] === "object" ||
        typeof object[prop] === "function") &&
      !Object.isFrozen(object[prop])
    ) {
      deepFreeze(object[prop]);
    }
  });

  return object;
}

export { deepFreeze };
