/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  assertType,
  getResponsiveElementPaddingValue,
  isValidForUpload,
  setEnableDebugLog,
  isEnableDebugLog,
  debugLog,
  consoleError,
  consoleLog,
  consoleWarn,
  consoleDebug,
} from "../../../src/chat/shared/utils/miscUtils";
import { FileStatusValue } from "../../../src/chat/shared/utils/constants";

describe("miscUtils", () => {
  describe("assertType", () => {
    it("should return the same item", () => {
      const obj = { test: "value" };
      expect(assertType(obj)).toBe(obj);
    });

    it("should work with different types", () => {
      expect(assertType("string")).toBe("string");
      expect(assertType(42)).toBe(42);
      expect(assertType(true)).toBe(true);
    });
  });

  describe("getResponsiveElementPaddingValue", () => {
    it("should return correct padding for default height", () => {
      const result = getResponsiveElementPaddingValue();
      expect(result).toBe("56.25%");
    });

    it("should return correct padding for custom height", () => {
      const result = getResponsiveElementPaddingValue(100);
      expect(result).toBe("31.25%");
    });

    it("should handle zero height", () => {
      const result = getResponsiveElementPaddingValue(0);
      expect(result).toBe("0%");
    });

    it("should handle large heights", () => {
      const result = getResponsiveElementPaddingValue(640);
      expect(result).toBe("200%");
    });
  });

  describe("isValidForUpload", () => {
    it("should return true for valid upload", () => {
      const upload = {
        status: FileStatusValue.EDIT,
        isError: false,
      } as any;

      expect(isValidForUpload(upload)).toBe(true);
    });

    it("should return false for upload with error", () => {
      const upload = {
        status: FileStatusValue.EDIT,
        isError: true,
      } as any;

      expect(isValidForUpload(upload)).toBe(false);
    });

    it("should return false for upload not in edit status", () => {
      const upload = {
        status: FileStatusValue.UPLOADING,
        isError: false,
      } as any;

      expect(isValidForUpload(upload)).toBe(false);
    });

    it("should return false for upload with both error and wrong status", () => {
      const upload = {
        status: FileStatusValue.UPLOADING,
        isError: true,
      } as any;

      expect(isValidForUpload(upload)).toBe(false);
    });
  });

  describe("debug logging", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
      setEnableDebugLog(false); // Reset to false
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe("setEnableDebugLog and isEnableDebugLog", () => {
      it("should set and get debug log flag", () => {
        expect(isEnableDebugLog()).toBe(false);

        setEnableDebugLog(true);
        expect(isEnableDebugLog()).toBe(true);

        setEnableDebugLog(false);
        expect(isEnableDebugLog()).toBe(false);
      });
    });

    describe("debugLog", () => {
      it("should not log when debug is disabled", () => {
        setEnableDebugLog(false);
        debugLog("test message");
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it("should log when debug is enabled", () => {
        setEnableDebugLog(true);
        debugLog("test message", "arg1", "arg2");
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Chat] test message",
          "arg1",
          "arg2",
        );
      });
    });
  });

  describe("console utilities", () => {
    let errorSpy: jest.SpyInstance;
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;

    beforeEach(() => {
      errorSpy = jest.spyOn(console, "error").mockImplementation();
      logSpy = jest.spyOn(console, "log").mockImplementation();
      warnSpy = jest.spyOn(console, "warn").mockImplementation();
      debugSpy = jest.spyOn(console, "debug").mockImplementation();
    });

    afterEach(() => {
      errorSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });

    describe("consoleError", () => {
      it("should log error with prefix", () => {
        consoleError("error message", "extra");
        expect(errorSpy).toHaveBeenCalledWith("[Chat] error message", "extra");
      });
    });

    describe("consoleLog", () => {
      it("should log message with prefix", () => {
        consoleLog("log message", "extra");
        expect(logSpy).toHaveBeenCalledWith("[Chat] log message", "extra");
      });
    });

    describe("consoleWarn", () => {
      it("should log warning with prefix", () => {
        consoleWarn("warn message", "extra");
        expect(warnSpy).toHaveBeenCalledWith("[Chat] warn message", "extra");
      });
    });

    describe("consoleDebug", () => {
      it("should log debug with prefix", () => {
        consoleDebug("debug message", "extra");
        expect(debugSpy).toHaveBeenCalledWith("[Chat] debug message", "extra");
      });
    });
  });
});
