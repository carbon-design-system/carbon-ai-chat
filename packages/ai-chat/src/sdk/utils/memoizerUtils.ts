/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Simple memoization utility that caches the result of the last function call.
 * Only re-computes if the arguments have changed.
 */
function memoizeFunction<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return,
  isEqual?: (newArgs: Args, lastArgs: Args) => boolean
): (...args: Args) => Return {
  let hasResult = false;
  let lastArgs: Args;
  let lastResult: Return;

  return (...args: Args): Return => {
    if (!hasResult || !areArgumentsEqual(args, lastArgs, isEqual)) {
      hasResult = true;
      lastArgs = args;
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

function areArgumentsEqual<Args extends readonly unknown[]>(
  newArgs: Args,
  lastArgs: Args,
  isEqual?: (newArgs: Args, lastArgs: Args) => boolean
): boolean {
  if (isEqual) {
    return isEqual(newArgs, lastArgs);
  }

  if (newArgs.length !== lastArgs.length) {
    return false;
  }

  for (let i = 0; i < newArgs.length; i++) {
    if (newArgs[i] !== lastArgs[i]) {
      return false;
    }
  }

  return true;
}

export { memoizeFunction };
