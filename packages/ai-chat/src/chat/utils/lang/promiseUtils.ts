/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Miscellaneous utils for dealing with promises.
 */

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * This function returns a Promise that will be resolved if the provided Promise has resolved within the duration
 * specified. Otherwise the promise will be rejected.
 *
 * @param promise The Promise which will be resolved or timed out.
 * @param duration The duration of the timeout in milliseconds.
 * @param errorMessage An optional message to display.
 */
function resolveOrTimeout<T>(
  promise: Promise<T>,
  duration: number,
  errorMessage?: string,
): Promise<T> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      const message =
        errorMessage || `The operation timed out after ${duration}ms`;
      reject(message);
    }, duration);
  });

  // Returns a race between the timeout and the original in promise
  return Promise.race([promise, timeout]);
}

export { resolveOrTimeout, sleep };
