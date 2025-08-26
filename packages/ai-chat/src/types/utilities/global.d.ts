/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains TypeScript definitions for overriding or setting global symbols. The interfaces below that
 * already exist make use of declaration merging where TypeScript will merge the existing and new declarations which
 * allows us to add stuff without having to redeclare the entire thing.
 */

declare global {
  /**
   * Adding some TypeScript magic here to provide overloads for the Promise.all function that will give us type
   * safety for each individual entry in the promise array, but only up to 10 promises and only when the function is
   * called with the array inline (not when a variable that's an array is passed to it).
   *
   * This means that if you call `const [result1, result2] = await Promise.all([promise1, promise2]);`, then the
   * types for `result1` and `result2` will be properly typed to the separate results of `promise1` and `promise2`.
   *
   * @see https://www.typescriptlang.org/docs/handbook/functions.html#overloads
   */
  interface PromiseConstructor {
    all<T1>(values: [T1 | PromiseLike<T1>]): Promise<[T1]>;
    all<T1, T2>(
      values: [T1 | PromiseLike<T1>, T2 | PromiseLike<T2>],
    ): Promise<[T1, T2]>;
    all<T1, T2, T3>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
      ],
    ): Promise<[T1, T2, T3]>;
    all<T1, T2, T3, T4>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
      ],
    ): Promise<[T1, T2, T3, T4]>;
    all<T1, T2, T3, T4, T5>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
      ],
    ): Promise<[T1, T2, T3, T4, T5]>;
    all<T1, T2, T3, T4, T5, T6>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
      ],
    ): Promise<[T1, T2, T3, T4, T5, T6]>;
    all<T1, T2, T3, T4, T5, T6, T7>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
      ],
    ): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>,
      ],
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>,
        T9 | PromiseLike<T9>,
      ],
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
    all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
      values: [
        T1 | PromiseLike<T1>,
        T2 | PromiseLike<T2>,
        T3 | PromiseLike<T3>,
        T4 | PromiseLike<T4>,
        T5 | PromiseLike<T5>,
        T6 | PromiseLike<T6>,
        T7 | PromiseLike<T7>,
        T8 | PromiseLike<T8>,
        T9 | PromiseLike<T9>,
        T10 | PromiseLike<T10>,
      ],
    ): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
  }
}
