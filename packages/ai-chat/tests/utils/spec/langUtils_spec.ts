/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isNil, isOdd } from "../../../src/chat/shared/utils/lang/langUtils";

describe("langUtils", () => {
  describe("isNil", () => {
    it("should return true for null", () => {
      expect(isNil(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isNil(undefined)).toBe(true);
    });

    it("should return false for non-nil values", () => {
      expect(isNil(0)).toBe(false);
      expect(isNil("")).toBe(false);
      expect(isNil(false)).toBe(false);
      expect(isNil([])).toBe(false);
      expect(isNil({})).toBe(false);
      expect(isNil("test")).toBe(false);
      expect(isNil(42)).toBe(false);
    });
  });

  describe("isOdd", () => {
    it("should return true for odd numbers", () => {
      expect(isOdd(1)).toBe(true);
      expect(isOdd(3)).toBe(true);
      expect(isOdd(5)).toBe(true);
      expect(isOdd(7)).toBe(true);
      expect(isOdd(9)).toBe(true);
    });

    it("should return false for even numbers", () => {
      expect(isOdd(0)).toBe(false);
      expect(isOdd(2)).toBe(false);
      expect(isOdd(4)).toBe(false);
      expect(isOdd(6)).toBe(false);
      expect(isOdd(8)).toBe(false);
    });

    it("should handle negative numbers", () => {
      expect(isOdd(-1)).toBe(true); // Math.abs(-1 % 2) = Math.abs(-1) = 1
      expect(isOdd(-3)).toBe(true); // Math.abs(-3 % 2) = Math.abs(-1) = 1
      expect(isOdd(-2)).toBe(false); // Math.abs(-2 % 2) = Math.abs(0) = 0
      expect(isOdd(-4)).toBe(false); // Math.abs(-4 % 2) = Math.abs(0) = 0
    });

    it("should handle decimal numbers", () => {
      expect(isOdd(1.5)).toBe(false); // 1.5 % 2 = 1.5, not equal to 1
      expect(isOdd(2.5)).toBe(false); // 2.5 % 2 = 0.5, not equal to 1
      expect(isOdd(3.0)).toBe(true); // 3.0 % 2 = 1, equal to 1
    });
  });
});
