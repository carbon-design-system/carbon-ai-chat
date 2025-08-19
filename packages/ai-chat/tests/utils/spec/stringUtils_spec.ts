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
  parseUnknownDataToMarkdown,
} from "../../../src/chat/shared/utils/lang/stringUtils";

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

  describe("parseUnknownDataToMarkdown", () => {
    it("should format object data as markdown code block", () => {
      const data = { key: "value", number: 42 };
      const result = parseUnknownDataToMarkdown(data);
      expect(result).toBe(
        '```\n{\n  "key": "value",\n  "number": 42\n}\n```\n',
      );
    });

    it("should format JSON string as markdown code block", () => {
      const data = '{"key": "value"}';
      const result = parseUnknownDataToMarkdown(data);
      expect(result).toBe('```\n{\n  "key": "value"\n}\n```\n');
    });

    it("should return string as-is for non-JSON string", () => {
      const data = "hello world";
      const result = parseUnknownDataToMarkdown(data);
      expect(result).toBe("hello world");
    });

    it("should convert non-object, non-string to string", () => {
      const result = parseUnknownDataToMarkdown(42);
      expect(result).toBe("42");
    });

    it("should return undefined for null/undefined data", () => {
      expect(parseUnknownDataToMarkdown(null)).toBeUndefined();
      expect(parseUnknownDataToMarkdown(undefined)).toBeUndefined();
    });

    it("should return undefined for falsy data", () => {
      expect(parseUnknownDataToMarkdown(false)).toBeUndefined();
      expect(parseUnknownDataToMarkdown(0)).toBeUndefined();
      expect(parseUnknownDataToMarkdown("")).toBeUndefined();
    });
  });
});
