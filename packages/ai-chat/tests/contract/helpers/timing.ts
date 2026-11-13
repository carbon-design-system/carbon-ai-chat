/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

/** A promise a test settles by hand. */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

/** Makes a promise a test settles by hand, such as a gate for a handler. */
export function deferred<T = void>(): Deferred<T> {
  let resolve: (value: T) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Moves Jest's fake timers forward, inside `act`. Call `jest.useFakeTimers()`
 * after the mount, and `jest.useRealTimers()` in `afterEach`.
 */
export async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/**
 * Waits `ms` of real time inside `act`, to give the chat a chance to do
 * something a test expects it not to do. Never use it to wait for something
 * to happen: use `waitFor` or an awaited promise.
 */
export async function pause(ms = 50): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
