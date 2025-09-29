/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isValidURL } from "../../../src/chat/utils/htmlUtils";

describe("htmlUtils", () => {
  describe("isValidURL", () => {
    it("should return true for http URLs", () => {
      expect(isValidURL("http://example.com")).toBe(true);
      expect(isValidURL("http://www.example.com")).toBe(true);
      expect(isValidURL("http://example.com/path")).toBe(true);
    });

    it("should return true for https URLs", () => {
      expect(isValidURL("https://example.com")).toBe(true);
      expect(isValidURL("https://www.example.com")).toBe(true);
      expect(isValidURL("https://example.com/path?query=value")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidURL("")).toBe(false);
    });

    it("should return false for null string", () => {
      expect(isValidURL("null")).toBe(false);
    });

    it("should return false for non-URL strings", () => {
      expect(isValidURL("example.com")).toBe(false);
      expect(isValidURL("www.example.com")).toBe(false);
      expect(isValidURL("ftp://example.com")).toBe(false);
      expect(isValidURL("mailto:test@example.com")).toBe(false);
    });

    it("should return false for strings with URL-like parts but not complete URLs", () => {
      expect(isValidURL("This is http but not a URL")).toBe(false);
      expect(isValidURL("https is mentioned here")).toBe(false);
    });

    it("should handle URLs with additional text", () => {
      expect(isValidURL("Visit http://example.com for more info")).toBe(true);
      expect(isValidURL("Check out https://example.com")).toBe(true);
    });
  });
});
