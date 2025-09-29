/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isNil } from "lodash-es";

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
});
