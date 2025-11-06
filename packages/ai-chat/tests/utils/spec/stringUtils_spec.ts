/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  isEmptyString,
  convertToEmptyStringIfStringifiedNull,
  convertPossibleStringifiedArrayToFirstString,
} from "../../../src/chat/utils/lang/stringUtils";

describe("stringUtils", () => {
  describe("isEmptyString", () => {
    it("should return true for empty string", () => {
      expect(isEmptyString("")).toBe(true);
    });

    it("should return true for null string", () => {
      expect(isEmptyString("null")).toBe(true);
    });

    it("should return false for non-empty string", () => {
      expect(isEmptyString("hello")).toBe(false);
    });

    it("should return false for whitespace string", () => {
      expect(isEmptyString(" ")).toBe(false);
    });
  });

  describe("convertToEmptyStringIfStringifiedNull", () => {
    it("should return null for string 'null'", () => {
      expect(convertToEmptyStringIfStringifiedNull("null")).toBeNull();
    });

    it("should return original string for non-null string", () => {
      expect(convertToEmptyStringIfStringifiedNull("hello")).toBe("hello");
    });

    it("should return original string for empty string", () => {
      expect(convertToEmptyStringIfStringifiedNull("")).toBe("");
    });
  });

  describe("convertPossibleStringifiedArrayToFirstString", () => {
    it("should extract first string from stringified array", () => {
      expect(
        convertPossibleStringifiedArrayToFirstString('["hello", "world"]'),
      ).toBe("hello");
    });

    it("should extract single string from stringified array", () => {
      expect(convertPossibleStringifiedArrayToFirstString('["hello"]')).toBe(
        "hello",
      );
    });

    it("should return original string if not a stringified array", () => {
      expect(convertPossibleStringifiedArrayToFirstString("hello")).toBe(
        "hello",
      );
    });

    it("should return original string for invalid JSON", () => {
      expect(convertPossibleStringifiedArrayToFirstString('["invalid')).toBe(
        '["invalid',
      );
    });

    it("should return original string for non-array JSON", () => {
      expect(
        convertPossibleStringifiedArrayToFirstString('{"key": "value"}'),
      ).toBe('{"key": "value"}');
    });
  });
});
