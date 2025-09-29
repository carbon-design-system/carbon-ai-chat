/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  sleep,
  resolveOrTimeout,
} from "../../../src/chat/utils/lang/promiseUtils";

describe("promiseUtils", () => {
  describe("sleep", () => {
    it("should resolve after specified time", async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90);
      expect(end - start).toBeLessThan(200);
    });

    it("should work with zero milliseconds", async () => {
      const start = Date.now();
      await sleep(0);
      const end = Date.now();

      expect(end - start).toBeLessThan(50);
    });
  });

  describe("resolveOrTimeout", () => {
    it("should resolve if promise resolves within timeout", async () => {
      const fastPromise = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 50),
      );

      const result = await resolveOrTimeout(fastPromise, 100);
      expect(result).toBe("success");
    });

    it("should reject if promise takes longer than timeout", async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 200),
      );

      await expect(resolveOrTimeout(slowPromise, 100)).rejects.toMatch(
        /The operation timed out after 100ms/,
      );
    });

    it("should use custom error message when provided", async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 200),
      );

      await expect(
        resolveOrTimeout(slowPromise, 100, "Custom timeout message"),
      ).rejects.toBe("Custom timeout message");
    });

    it("should resolve immediately if promise is already resolved", async () => {
      const resolvedPromise = Promise.resolve("immediate");

      const result = await resolveOrTimeout(resolvedPromise, 1000);
      expect(result).toBe("immediate");
    });

    it("should reject immediately if promise is already rejected", async () => {
      const rejectedPromise = Promise.reject(new Error("immediate error"));

      await expect(resolveOrTimeout(rejectedPromise, 1000)).rejects.toThrow(
        "immediate error",
      );
    });

    it("should handle promise that rejects within timeout", async () => {
      const rejectingPromise = new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error("promise error")), 50),
      );

      await expect(resolveOrTimeout(rejectingPromise, 100)).rejects.toThrow(
        "promise error",
      );
    });

    it("should work with different data types", async () => {
      const numberPromise = Promise.resolve(42);
      const objectPromise = Promise.resolve({ key: "value" });
      const arrayPromise = Promise.resolve([1, 2, 3]);

      expect(await resolveOrTimeout(numberPromise, 100)).toBe(42);
      expect(await resolveOrTimeout(objectPromise, 100)).toEqual({
        key: "value",
      });
      expect(await resolveOrTimeout(arrayPromise, 100)).toEqual([1, 2, 3]);
    });
  });
});
