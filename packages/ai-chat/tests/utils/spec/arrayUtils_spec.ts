/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  asArray,
  asyncForEach,
  findLast,
  findLastWithMap,
  arrayLastValue,
} from "../../../src/chat/shared/utils/lang/arrayUtils";

describe("arrayUtils", () => {
  describe("asArray", () => {
    it("should return array as-is", () => {
      const input = [1, 2, 3];
      expect(asArray(input)).toBe(input);
    });

    it("should wrap single value in array", () => {
      expect(asArray(42)).toEqual([42]);
    });

    it("should wrap string in array", () => {
      expect(asArray("hello")).toEqual(["hello"]);
    });

    it("should wrap null in array", () => {
      expect(asArray(null)).toEqual([null]);
    });
  });

  describe("asyncForEach", () => {
    it("should execute callback for each item in series", async () => {
      const results: number[] = [];
      const delays = [50, 20, 30];

      await asyncForEach([1, 2, 3], async (value, index) => {
        await new Promise((resolve) => setTimeout(resolve, delays[index]));
        results.push(value);
      });

      expect(results).toEqual([1, 2, 3]);
    });

    it("should pass correct parameters to callback", async () => {
      const calls: Array<{ value: string; index: number; array: string[] }> =
        [];
      const array = ["a", "b", "c"];

      await asyncForEach(array, async (value, index, arr) => {
        calls.push({ value, index, array: arr });
      });

      expect(calls).toEqual([
        { value: "a", index: 0, array },
        { value: "b", index: 1, array },
        { value: "c", index: 2, array },
      ]);
    });

    it("should handle empty array", async () => {
      const callback = jest.fn();
      await asyncForEach([], callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("findLast", () => {
    it("should find last matching element", () => {
      const array = [1, 2, 3, 2, 4];
      const result = findLast(array, (value) => value === 2);
      expect(result).toBe(2);
    });

    it("should return undefined if no match found", () => {
      const array = [1, 2, 3];
      const result = findLast(array, (value) => value === 5);
      expect(result).toBeUndefined();
    });

    it("should start from specified index", () => {
      const array = [1, 2, 3, 2, 4];
      const result = findLast(array, (value) => value === 2, 2);
      expect(result).toBe(2);
    });

    it("should handle empty array", () => {
      const result = findLast([], (value) => value === 1);
      expect(result).toBeUndefined();
    });

    it("should handle null array", () => {
      const result = findLast(null as any, (value) => value === 1);
      expect(result).toBeUndefined();
    });
  });

  describe("findLastWithMap", () => {
    it("should find last matching element from map", () => {
      const keys = ["a", "b", "c", "b"];
      const map = { a: 1, b: 2, c: 3 };
      const result = findLastWithMap(keys, map, (value) => value === 2);
      expect(result).toBe(2);
    });

    it("should return undefined if no match found", () => {
      const keys = ["a", "b", "c"];
      const map = { a: 1, b: 2, c: 3 };
      const result = findLastWithMap(keys, map, (value) => value === 5);
      expect(result).toBeUndefined();
    });

    it("should handle empty keys array", () => {
      const map = { a: 1, b: 2 };
      const result = findLastWithMap([], map, (value) => value === 1);
      expect(result).toBeUndefined();
    });

    it("should handle missing keys in map", () => {
      const keys = ["a", "missing", "b"];
      const map = { a: 1, b: 2 };
      const result = findLastWithMap(keys, map, (value) => value === undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("arrayLastValue", () => {
    it("should return last value of array", () => {
      expect(arrayLastValue([1, 2, 3])).toBe(3);
    });

    it("should return single value for single-element array", () => {
      expect(arrayLastValue([42])).toBe(42);
    });

    it("should return null for empty array", () => {
      expect(arrayLastValue([])).toBeNull();
    });

    it("should return null for null array", () => {
      expect(arrayLastValue(null as any)).toBeNull();
    });

    it("should return null for undefined array", () => {
      expect(arrayLastValue(undefined as any)).toBeNull();
    });
  });
});
