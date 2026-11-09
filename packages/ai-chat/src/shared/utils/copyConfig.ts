/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Copies a config the chat is handed, so later edits to the caller's object
 * change nothing the chat stored (#1833). Plain objects and arrays are copied
 * all the way down. Everything else keeps its reference: functions, class
 * instances, DOM nodes, dates, and the like. The caller's data is never
 * frozen or changed.
 *
 * @param value - The config, or any part of it.
 * @returns A copy that shares only the values that aren't plain data.
 */
function copyConfig<T>(value: T): T {
  return copy(value, new WeakMap()) as T;
}

function copy(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach((item, index) => {
      result[index] = copy(item, seen);
    });
    return result;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const result: Record<string, unknown> = Object.create(
      Object.getPrototypeOf(value)
    );
    seen.set(value, result);
    Object.keys(value).forEach((key) => {
      result[key] = copy(value[key], seen);
    });
    return result;
  }
  return value;
}

export { copyConfig };
