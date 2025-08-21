/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  isBrowser,
  IS_IOS,
  IS_MOBILE,
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  getURLHostName,
  conditionalSetTimeout,
} from "../../../src/chat/shared/utils/browserUtils";

// Mock browser environment for testing
const originalWindow = global.window;
const originalNavigator = global.navigator;

describe("browserUtils", () => {
  afterEach(() => {
    // Restore original values
    (global as any).window = originalWindow;
    (global as any).navigator = originalNavigator;
  });

  describe("isBrowser", () => {
    it("should detect browser environment", () => {
      expect(typeof isBrowser).toBe("boolean");
    });
  });

  describe("getURLHostName", () => {
    it("should extract hostname from valid URLs", () => {
      expect(getURLHostName("https://example.com")).toBe("example.com");
      expect(getURLHostName("http://www.example.com:8080")).toBe(
        "www.example.com",
      );
      expect(getURLHostName("https://subdomain.example.com/path?query=1")).toBe(
        "subdomain.example.com",
      );
    });

    it("should return original string for invalid URLs", () => {
      expect(getURLHostName("not-a-url")).toBe("not-a-url");
      expect(getURLHostName("")).toBe("");
      expect(getURLHostName("just-text")).toBe("just-text");
    });

    it("should handle various URL formats", () => {
      expect(getURLHostName("ftp://files.example.com")).toBe(
        "files.example.com",
      );
      expect(getURLHostName("http://localhost")).toBe("localhost");
      expect(getURLHostName("https://127.0.0.1")).toBe("127.0.0.1");
    });
  });

  describe("conditionalSetTimeout", () => {
    it("should execute operation immediately when timeout is 0", () => {
      const mockFn = jest.fn();
      const result = conditionalSetTimeout(mockFn, 0);

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should execute operation immediately when timeout is falsy", () => {
      const mockFn = jest.fn();
      conditionalSetTimeout(mockFn, null as any);
      conditionalSetTimeout(mockFn, undefined as any);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should return timeout ID when timeout is provided", () => {
      const mockFn = jest.fn();
      const result = conditionalSetTimeout(mockFn, 100);

      expect(result).not.toBeNull();
      expect(typeof result).toBe("number"); // setTimeout returns number in browser environment

      // Clean up
      if (result) {
        clearTimeout(result);
      }
    });

    it("should execute operation after timeout", (done) => {
      const mockFn = jest.fn();
      conditionalSetTimeout(mockFn, 50);

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe("device detection constants", () => {
    it("should export device detection constants", () => {
      // Test that the constants are boolean values
      expect(typeof IS_IOS).toBe("boolean");
      expect(typeof IS_MOBILE).toBe("boolean");
      expect(typeof IS_PHONE).toBe("boolean");
      expect(typeof IS_PHONE_IN_PORTRAIT_MODE).toBe("boolean");
    });
  });
});
