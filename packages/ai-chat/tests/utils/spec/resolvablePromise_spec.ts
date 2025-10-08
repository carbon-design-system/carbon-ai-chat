/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { resolvablePromise } from "../../../src/chat/utils/resolvablePromise";

describe("resolvablePromise", () => {
  describe("resolvablePromise function", () => {
    it("should create a promise with initial state", () => {
      const promise = resolvablePromise<string>();

      expect(promise.isResolved).toBe(false);
      expect(promise.isRejected).toBe(false);
      expect(promise.isComplete).toBe(false);
      expect(typeof promise.doResolve).toBe("function");
      expect(typeof promise.doReject).toBe("function");
    });

    it("should resolve with doResolve", async () => {
      const promise = resolvablePromise<string>();

      promise.doResolve("test value");

      expect(promise.isResolved).toBe(true);
      expect(promise.isRejected).toBe(false);
      expect(promise.isComplete).toBe(true);

      const result = await promise;
      expect(result).toBe("test value");
    });

    it("should resolve without value", async () => {
      const promise = resolvablePromise<void>();

      promise.doResolve();

      expect(promise.isResolved).toBe(true);
      expect(promise.isRejected).toBe(false);
      expect(promise.isComplete).toBe(true);

      const result = await promise;
      expect(result).toBeUndefined();
    });

    it("should reject with doReject", async () => {
      const promise = resolvablePromise<string>();

      promise.doReject("error message");

      expect(promise.isResolved).toBe(false);
      expect(promise.isRejected).toBe(true);
      expect(promise.isComplete).toBe(true);

      try {
        await promise;
        fail("Promise should have rejected");
      } catch (error) {
        expect(error).toBe("error message");
      }
    });

    it("should reject with Error object", async () => {
      const promise = resolvablePromise<string>();
      const error = new Error("test error");

      promise.doReject(error);

      expect(promise.isResolved).toBe(false);
      expect(promise.isRejected).toBe(true);
      expect(promise.isComplete).toBe(true);

      try {
        await promise;
        fail("Promise should have rejected");
      } catch (caughtError) {
        expect(caughtError).toBe(error);
      }
    });

    it("should work with different types", async () => {
      const numberPromise = resolvablePromise<number>();
      const objectPromise = resolvablePromise<{ key: string }>();
      const arrayPromise = resolvablePromise<number[]>();

      numberPromise.doResolve(42);
      objectPromise.doResolve({ key: "value" });
      arrayPromise.doResolve([1, 2, 3]);

      expect(await numberPromise).toBe(42);
      expect(await objectPromise).toEqual({ key: "value" });
      expect(await arrayPromise).toEqual([1, 2, 3]);
    });

    it("should behave like a normal promise with then/catch", () => {
      const promise = resolvablePromise<string>();

      let thenResult: string | null = null;
      let catchResult: any = null;

      promise
        .then((result) => {
          thenResult = result;
        })
        .catch((error) => {
          catchResult = error;
        });

      promise.doResolve("success");

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(thenResult).toBe("success");
          expect(catchResult).toBeNull();
          resolve();
        }, 0);
      });
    });

    it("should work with Promise.all", async () => {
      const promise1 = resolvablePromise<string>();
      const promise2 = resolvablePromise<number>();

      setTimeout(() => {
        promise1.doResolve("test");
        promise2.doResolve(42);
      }, 10);

      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual(["test", 42]);
    });

    it("should not change state once resolved", () => {
      const promise = resolvablePromise<string>();

      promise.doResolve("first");

      expect(promise.isResolved).toBe(true);
      expect(promise.isComplete).toBe(true);

      // Calling doResolve again should not change state
      promise.doResolve("second");

      expect(promise.isResolved).toBe(true);
      expect(promise.isComplete).toBe(true);
    });

    it("should not change state once rejected", () => {
      const promise = resolvablePromise<string>();

      // Add a catch handler to prevent unhandled rejection
      promise.catch(() => {
        // Expected rejection - do nothing
      });

      promise.doReject("error");

      expect(promise.isRejected).toBe(true);
      expect(promise.isComplete).toBe(true);

      // Calling doReject again should not change state
      promise.doReject("second error");

      expect(promise.isRejected).toBe(true);
      expect(promise.isComplete).toBe(true);
    });
  });
});
