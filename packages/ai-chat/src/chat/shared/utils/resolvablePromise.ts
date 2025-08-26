/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Represents a thing that can be resolved.
 */
interface Resolvable<TResolveType = any> {
  /**
   * Resolves this resolvable.
   */
  doResolve: (resolveValue?: TResolveType) => void;

  /**
   * Rejects this resolvable.
   */
  doReject: (reason?: any) => void;

  /**
   * Indicates if this resolvable has been resolved.
   */
  isResolved: boolean;

  /**
   * Indicates if this resolvable has been rejected.
   */
  isRejected: boolean;

  /**
   * Indicates if this resolvable has been either resolved or rejected.
   */
  isComplete: boolean;
}

/**
 * This type is an extension of the Promise type that adds additional functions that can be used to resolve the promise.
 */
type ResolvablePromise<TResolveType = any> = Resolvable<TResolveType> &
  Promise<TResolveType>;

/**
 * This function will return a new promise that keeps a reference to its own resolve and reject functions so that they
 * can be called on demand by the code using the promise.
 */
function resolvablePromise<
  TResolveType = void,
>(): ResolvablePromise<TResolveType> {
  let resolveFunction: (
    value?: TResolveType | PromiseLike<TResolveType>,
  ) => void;
  let rejectFunction: (reason?: any) => void;

  const promise = new Promise<TResolveType>((resolve, reject) => {
    resolveFunction = resolve;
    rejectFunction = reject;
  }) as ResolvablePromise<TResolveType>;

  promise.doResolve = (resolveValue?: TResolveType) => {
    promise.isResolved = true;
    promise.isComplete = true;
    resolveFunction(resolveValue);
  };

  promise.doReject = (rejectValue?: any) => {
    promise.isRejected = true;
    promise.isComplete = true;
    rejectFunction(rejectValue);
  };

  promise.isResolved = false;
  promise.isRejected = false;
  promise.isComplete = false;

  return promise;
}

export { ResolvablePromise, resolvablePromise };
